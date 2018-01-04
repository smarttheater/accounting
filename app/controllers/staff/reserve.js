"use strict";
/**
 * 内部関係者座席予約コントローラー
 * @namespace controllers.staff.reserve
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const ttts = require("@motionpicture/ttts-domain");
const conf = require("config");
const createDebug = require("debug");
const moment = require("moment");
const _ = require("underscore");
const reservePerformanceForm_1 = require("../../forms/reserve/reservePerformanceForm");
const session_1 = require("../../models/reserve/session");
const reserveBaseController = require("../reserveBase");
const debug = createDebug('ttts-staff:controller:reserve');
const PURCHASER_GROUP = ttts.factory.person.Group.Staff;
const layout = 'layouts/staff/layout';
const paymentMethodNames = { F: '無料招待券', I: '請求書支払い' };
const reserveMaxDateInfo = conf.get('reserve_max_date');
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
function start(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // 期限指定
        if (moment() < moment(conf.get('datetimes.reservation_start_staffs'))) {
            next(new Error(req.__('Message.OutOfTerm')));
            return;
        }
        try {
            // 購入結果セッション初期化
            delete req.session.transactionResult;
            delete req.session.printToken;
            const reservationModel = yield reserveBaseController.processStart(PURCHASER_GROUP, req);
            reservationModel.save(req);
            if (reservationModel.transactionInProgress.performance !== undefined) {
                const cb = '/staff/reserve/tickets';
                res.redirect(`/staff/reserve/terms?cb=${encodeURIComponent(cb)}`);
            }
            else {
                const cb = '/staff/reserve/performances';
                res.redirect(`/staff/reserve/terms?cb=${encodeURIComponent(cb)}`);
            }
        }
        catch (error) {
            console.error(error);
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.start = start;
/**
 * 規約(スキップ)
 */
function terms(req, res, __) {
    const cb = (!_.isEmpty(req.query.cb)) ? req.query.cb : '/';
    res.redirect(cb);
}
exports.terms = terms;
/**
 * スケジュール選択
 * @method performances
 * @returns {Promise<void>}
 */
function performances(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Expired')));
                return;
            }
            const token = req.tttsAuthClient.credentials;
            const maxDate = moment();
            Object.keys(reserveMaxDateInfo).forEach((key) => {
                maxDate.add(key, reserveMaxDateInfo[key]);
            });
            const reserveMaxDate = maxDate.format('YYYY/MM/DD');
            if (req.method === 'POST') {
                reservePerformanceForm_1.default(req);
                const validationResult = yield req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    next(new Error(req.__('UnexpectedError')));
                    return;
                }
                try {
                    // パフォーマンスFIX
                    yield reserveBaseController.processFixPerformance(reservationModel, req.body.performanceId, req);
                    reservationModel.save(req);
                    res.redirect('/staff/reserve/tickets');
                    return;
                }
                catch (error) {
                    next(new Error(req.__('UnexpectedError')));
                    return;
                }
            }
            else {
                res.render('staff/reserve/performances', {
                    token: token,
                    reserveMaxDate: reserveMaxDate,
                    layout: layout
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.performances = performances;
/**
 * 券種選択
 */
function tickets(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Expired')));
                return;
            }
            // パフォーマンスは指定済みのはず
            if (reservationModel.transactionInProgress.performance === undefined) {
                throw new Error(req.__('UnexpectedError'));
            }
            reservationModel.transactionInProgress.paymentMethod = ttts.factory.paymentMethodType.Invitation;
            if (req.method === 'POST') {
                // 仮予約あればキャンセルする
                try {
                    // セッション中の予約リストを初期化
                    reservationModel.transactionInProgress.reservations = [];
                    // 座席仮予約があればキャンセル
                    if (reservationModel.transactionInProgress.seatReservationAuthorizeActionId !== undefined) {
                        const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
                            endpoint: process.env.API_ENDPOINT,
                            auth: req.tttsAuthClient
                        });
                        debug('canceling seat reservation authorize action...');
                        const actionId = reservationModel.transactionInProgress.seatReservationAuthorizeActionId;
                        delete reservationModel.transactionInProgress.seatReservationAuthorizeActionId;
                        yield placeOrderTransactionService.cancelSeatReservationAuthorization({
                            transactionId: reservationModel.transactionInProgress.id,
                            actionId: actionId
                        });
                        debug('seat reservation authorize action canceled.');
                    }
                }
                catch (error) {
                    next(error);
                    return;
                }
                try {
                    // 現在時刻が開始時刻を過ぎている時
                    if (moment(reservationModel.transactionInProgress.performance.start_date).toDate() < moment().toDate()) {
                        //「ご希望の枚数が用意できないため予約できません。」
                        throw new Error(req.__('NoAvailableSeats'));
                    }
                    // 予約処理
                    yield reserveBaseController.processFixSeatsAndTickets(reservationModel, req);
                    reservationModel.save(req);
                    res.redirect('/staff/reserve/profile');
                }
                catch (error) {
                    // "予約可能な席がございません"などのメッセージ表示
                    res.locals.message = error.message;
                    // 車椅子レート制限を超過した場合
                    if (error instanceof ttts.factory.errors.RateLimitExceeded ||
                        error instanceof ttts.factory.errors.AlreadyInUse) {
                        res.locals.message = req.__('NoAvailableSeats');
                    }
                    res.render('staff/reserve/tickets', {
                        reservationModel: reservationModel,
                        layout: layout
                    });
                }
            }
            else {
                // 券種選択画面へ遷移
                res.locals.message = '';
                res.render('staff/reserve/tickets', {
                    reservationModel: reservationModel,
                    layout: layout
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.tickets = tickets;
/**
 * 購入者情報
 */
function profile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    yield reserveBaseController.processFixProfile(reservationModel, req, res);
                    reservationModel.save(req);
                    res.redirect('/staff/reserve/confirm');
                }
                catch (error) {
                    res.render('staff/reserve/profile', {
                        reservationModel: reservationModel,
                        layout: layout
                    });
                }
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.transactionInProgress.purchaser.email;
                res.locals.lastName = reservationModel.transactionInProgress.purchaser.lastName;
                res.locals.firstName = reservationModel.transactionInProgress.purchaser.firstName;
                res.locals.tel = reservationModel.transactionInProgress.purchaser.tel;
                res.locals.age = reservationModel.transactionInProgress.purchaser.age;
                res.locals.address = reservationModel.transactionInProgress.purchaser.address;
                res.locals.gender = reservationModel.transactionInProgress.purchaser.gender;
                res.locals.email = (!_.isEmpty(email)) ? email : '';
                res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                res.locals.paymentMethod =
                    (!_.isEmpty(reservationModel.transactionInProgress.paymentMethod))
                        ? reservationModel.transactionInProgress.paymentMethod
                        : ttts.factory.paymentMethodType.Invitation;
                res.render('staff/reserve/profile', {
                    reservationModel: reservationModel,
                    layout: layout
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.profile = profile;
/**
 * 予約内容確認
 */
function confirm(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
                next(new Error(req.__('Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    // 予約確定
                    const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
                        endpoint: process.env.API_ENDPOINT,
                        auth: req.tttsAuthClient
                    });
                    const transactionResult = yield placeOrderTransactionService.confirm({
                        transactionId: reservationModel.transactionInProgress.id,
                        paymentMethod: reservationModel.transactionInProgress.paymentMethod
                    });
                    debug('transaction confirmed. orderNumber:', transactionResult.order.orderNumber);
                    // 購入結果セッション作成
                    req.session.transactionResult = transactionResult;
                    try {
                        // 完了メールキュー追加(あれば更新日時を更新するだけ)
                        const emailAttributes = yield reserveBaseController.createEmailAttributes(transactionResult.eventReservations, reservationModel.getTotalCharge(), res);
                        yield placeOrderTransactionService.sendEmailNotification({
                            transactionId: reservationModel.transactionInProgress.id,
                            emailMessageAttributes: emailAttributes
                        });
                        debug('email sent.');
                    }
                    catch (error) {
                        // 失敗してもスルー
                    }
                    //　購入フローセッションは削除
                    session_1.default.REMOVE(req);
                    res.redirect('/staff/reserve/complete');
                    return;
                }
                catch (error) {
                    session_1.default.REMOVE(req);
                    next(error);
                    return;
                }
            }
            else {
                const ticketInfos = reserveBaseController.getTicketInfos(reservationModel.transactionInProgress.reservations);
                // 券種ごとの表示情報編集
                Object.keys(ticketInfos).forEach((key) => {
                    const ticketInfo = ticketInfos[key];
                    ticketInfos[key].info =
                        `${ticketInfo.ticket_type_name[res.locale]} ${ticketInfo.charge} × ${res.__('{{n}}Leaf', { n: ticketInfo.count })}`;
                });
                res.render('staff/reserve/confirm', {
                    reservationModel: reservationModel,
                    ticketInfos: ticketInfos,
                    paymentMethodName: paymentMethodNames[reservationModel.transactionInProgress.paymentMethod],
                    layout: layout
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.confirm = confirm;
/**
 * 予約完了
 */
function complete(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // セッションに取引結果があるはず
            const transactionResult = req.session.transactionResult;
            if (transactionResult === undefined) {
                next(new Error(req.__('NotFound')));
                return;
            }
            let reservations = transactionResult.eventReservations;
            debug(reservations.length, 'reservation(s) found.');
            reservations = reservations.filter((r) => r.status === ttts.factory.reservationStatusType.ReservationConfirmed);
            // チケットをticket_type(id)でソート
            sortReservationstByTicketType(reservations);
            // 初めてのアクセスであれば印刷トークン発行
            if (req.session.printToken === undefined) {
                const tokenRepo = new ttts.repository.Token(redisClient);
                const printToken = yield tokenRepo.createPrintToken(reservations.map((r) => r.id));
                debug('printToken created.', printToken);
                req.session.printToken = printToken;
            }
            res.render('staff/reserve/complete', {
                reservations: reservations,
                printToken: req.session.printToken,
                layout: layout
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.complete = complete;
/**
 * チケットをticket_type(id)でソートする
 * @method sortReservationstByTicketType
 */
function sortReservationstByTicketType(reservations) {
    // チケットをticket_type(id)でソート
    reservations.sort((a, b) => {
        // 入塔日
        if (a.ticket_type > b.ticket_type) {
            return 1;
        }
        if (a.ticket_type < b.ticket_type) {
            return -1;
        }
        return 0;
    });
}

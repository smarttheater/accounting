"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 座席予約ベースコントローラー
 */
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const conf = require("config");
const createDebug = require("debug");
const moment = require("moment-timezone");
const numeral = require("numeral");
const _ = require("underscore");
const reserveProfileForm_1 = require("../forms/reserve/reserveProfileForm");
const reserveTicketForm_1 = require("../forms/reserve/reserveTicketForm");
const session_1 = require("../models/reserve/session");
const debug = createDebug('ttts-staff:controller');
/**
 * 購入開始プロセス
 */
// tslint:disable-next-line:max-func-body-length
function processStart(req) {
    return __awaiter(this, void 0, void 0, function* () {
        // 言語も指定
        req.session.locale = (!_.isEmpty(req.query.locale)) ? req.query.locale : 'ja';
        const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient
        });
        const oragnizationService = new tttsapi.service.Organization({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient
        });
        const sellerIdentifier = 'TokyoTower';
        const seller = yield oragnizationService.findCorporationByIdentifier({ identifier: sellerIdentifier });
        const expires = moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').toDate();
        const transaction = yield placeOrderTransactionService.start({
            expires: expires,
            sellerIdentifier: sellerIdentifier,
            purchaserGroup: tttsapi.factory.person.Group.Staff
        });
        debug('transaction started.', transaction.id);
        // 取引セッションを初期化
        const transactionInProgress = {
            id: transaction.id,
            agentId: transaction.agent.id,
            seller: seller,
            sellerId: transaction.seller.id,
            category: req.query.category,
            expires: expires.toISOString(),
            paymentMethodChoices: [],
            ticketTypes: [],
            purchaser: {
                lastName: '',
                firstName: '',
                tel: '',
                email: '',
                age: '',
                address: '',
                gender: ''
            },
            paymentMethod: tttsapi.factory.paymentMethodType.CreditCard,
            purchaserGroup: transaction.object.purchaser_group,
            transactionGMO: {
                orderId: '',
                amount: 0,
                count: 0
            },
            reservations: []
        };
        const reservationModel = new session_1.default(transactionInProgress);
        // セッションに購入者情報があれば初期値セット
        const purchaserFromSession = req.session.purchaser;
        if (purchaserFromSession !== undefined) {
            reservationModel.transactionInProgress.purchaser = purchaserFromSession;
        }
        if (!_.isEmpty(req.query.performance)) {
            // パフォーマンス指定遷移の場合 パフォーマンスFIX
            yield processFixPerformance(reservationModel, req.query.performance, req);
        }
        return reservationModel;
    });
}
exports.processStart = processStart;
/**
 * 座席・券種確定プロセス
 */
function processFixSeatsAndTickets(reservationModel, req) {
    return __awaiter(this, void 0, void 0, function* () {
        // パフォーマンスは指定済みのはず
        if (reservationModel.transactionInProgress.performance === undefined) {
            throw new Error(req.__('UnexpectedError'));
        }
        // 検証(券種が選択されていること)+チケット枚数合計計算
        const checkInfo = yield checkFixSeatsAndTickets(reservationModel, req);
        if (checkInfo.status === false) {
            throw new Error(checkInfo.message);
        }
        // チケット情報に枚数セット(画面で選択された枚数<画面再表示用)
        reservationModel.transactionInProgress.ticketTypes.forEach((ticketType) => {
            const choice = checkInfo.choices.find((c) => (ticketType.id === c.ticket_type));
            ticketType.count = (choice !== undefined) ? Number(choice.ticket_count) : 0;
        });
        // セッション中の予約リストを初期化
        reservationModel.transactionInProgress.reservations = [];
        // 座席承認アクション
        const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient
        });
        const offers = checkInfo.choicesAll.map((choice) => {
            return {
                ticket_type: choice.ticket_type,
                watcher_name: choice.watcher_name
            };
        });
        debug(`creating seatReservation authorizeAction on ${offers.length} offers...`);
        const action = yield placeOrderTransactionService.createSeatReservationAuthorization({
            transactionId: reservationModel.transactionInProgress.id,
            performanceId: reservationModel.transactionInProgress.performance.id,
            offers: offers
        });
        reservationModel.transactionInProgress.seatReservationAuthorizeActionId = action.id;
        // この時点で購入番号が発行される
        reservationModel.transactionInProgress.paymentNo =
            action.result.tmpReservations[0].reservationNumber;
        const tmpReservations = action.result.tmpReservations;
        // セッションに保管
        reservationModel.transactionInProgress.reservations = tmpReservations;
    });
}
exports.processFixSeatsAndTickets = processFixSeatsAndTickets;
/**
 * 座席・券種確定プロセス/検証処理
 */
function checkFixSeatsAndTickets(__, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkInfo = {
            status: false,
            choices: [],
            choicesAll: [],
            selectedCount: 0,
            extraCount: 0,
            message: ''
        };
        // 検証(券種が選択されていること)
        reserveTicketForm_1.default(req);
        const validationResult = yield req.getValidationResult();
        if (!validationResult.isEmpty()) {
            checkInfo.message = req.__('Invalid"');
            return checkInfo;
        }
        // 画面から座席選択情報が生成できなければエラー
        const choices = JSON.parse(req.body.choices);
        if (!Array.isArray(choices)) {
            checkInfo.message = req.__('UnexpectedError');
            return checkInfo;
        }
        checkInfo.choices = choices;
        // チケット枚数合計計算
        choices.forEach((choice) => {
            // チケットセット(選択枚数分)
            checkInfo.selectedCount += Number(choice.ticket_count);
            for (let index = 0; index < Number(choice.ticket_count); index += 1) {
                const choiceInfo = {
                    ticket_type: choice.ticket_type,
                    ticketCount: 1,
                    watcher_name: (typeof choice.watcher_name === 'string') ? choice.watcher_name : '',
                    choicesExtra: [],
                    updated: false
                };
                // 選択チケット本体分セット(選択枚数分)
                checkInfo.choicesAll.push(choiceInfo);
            }
        });
        checkInfo.status = true;
        return checkInfo;
    });
}
/**
 * 購入者情報確定プロセス
 */
function processFixProfile(reservationModel, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        reserveProfileForm_1.default(req);
        const validationResult = yield req.getValidationResult();
        res.locals.validation = validationResult.mapped();
        res.locals.paymentMethod = req.body.paymentMethod;
        if (!validationResult.isEmpty()) {
            throw new Error(req.__('Invalid'));
        }
        // 購入者情報を保存して座席選択へ
        const contact = {
            lastName: req.staffUser.familyName,
            firstName: req.staffUser.givenName,
            tel: req.staffUser.telephone,
            email: req.staffUser.email,
            age: reservationModel.transactionInProgress.purchaser.age,
            address: reservationModel.transactionInProgress.purchaser.address,
            gender: reservationModel.transactionInProgress.purchaser.gender
        };
        reservationModel.transactionInProgress.purchaser = contact;
        reservationModel.transactionInProgress.paymentMethod = req.body.paymentMethod;
        const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient
        });
        const customerContact = yield placeOrderTransactionService.setCustomerContact({
            transactionId: reservationModel.transactionInProgress.id,
            contact: {
                last_name: contact.lastName,
                first_name: contact.firstName,
                email: contact.email,
                tel: contact.tel,
                age: contact.age,
                address: contact.address,
                gender: contact.gender
            }
        });
        debug('customerContact set.', customerContact);
        // セッションに購入者情報格納
        req.session.purchaser = contact;
    });
}
exports.processFixProfile = processFixProfile;
/**
 * パフォーマンスをFIXするプロセス
 * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
 */
function processFixPerformance(reservationModel, perfomanceId, req) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('fixing performance...', perfomanceId);
        // パフォーマンス取得
        const eventService = new tttsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient
        });
        const performance = yield eventService.findPerofrmanceById({ id: perfomanceId });
        // 券種セット
        reservationModel.transactionInProgress.ticketTypes = performance.ticket_type_group.ticket_types.map((t) => {
            return Object.assign({}, t, { count: 0, watcher_name: '' });
        });
        // パフォーマンス情報を保管
        reservationModel.transactionInProgress.performance = performance;
    });
}
exports.processFixPerformance = processFixPerformance;
/**
 * 予約完了メールを作成する
 */
// tslint:disable-next-line:max-func-body-length
function createEmailAttributes(reservations, res) {
    return __awaiter(this, void 0, void 0, function* () {
        // チケットコード順にソート
        reservations.sort((a, b) => {
            if (a.reservedTicket.ticketType.identifier < b.reservedTicket.ticketType.identifier) {
                return -1;
            }
            if (a.reservedTicket.ticketType.identifier > b.reservedTicket.ticketType.identifier) {
                return 1;
            }
            return 0;
        });
        const underName = reservations[0].underName;
        const to = (underName !== undefined && underName.email !== undefined)
            ? underName.email
            : '';
        debug('to is', to);
        if (to.length === 0) {
            throw new Error('email to unknown');
        }
        const title = res.__('Title');
        const titleEmail = res.__('EmailTitle');
        // 券種ごとに合計枚数算出
        const ticketInfos = {};
        for (const reservation of reservations) {
            // チケットタイプセット
            const ticketType = reservation.reservedTicket.ticketType;
            let price = 0;
            if (reservation.reservedTicket !== undefined && reservation.reservedTicket.ticketType.priceSpecification !== undefined) {
                price = reservation.reservedTicket.ticketType.priceSpecification.price;
            }
            const dataValue = ticketType.identifier;
            // チケットタイプごとにチケット情報セット
            if (!ticketInfos.hasOwnProperty(dataValue)) {
                ticketInfos[dataValue] = {
                    ticket_type_name: ticketType.name,
                    charge: `\\${numeral(price).format('0,0')}`,
                    count: 1
                };
            }
            else {
                ticketInfos[dataValue].count += 1;
            }
        }
        // 券種ごとの表示情報編集
        const ticketInfoArray = [];
        Object.keys(ticketInfos).forEach((key) => {
            const ticketInfo = ticketInfos[key];
            ticketInfoArray.push(`${ticketInfo.ticket_type_name[res.locale]} ${res.__('{{n}}Leaf', { n: ticketInfo.count })}`);
        });
        const ticketInfoStr = ticketInfoArray.join('\n');
        const event = reservations[0].reservationFor;
        const day = moment(event.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
        const time = moment(event.startDate).tz('Asia/Tokyo').format('HH:mm');
        // 日本語の時は"姓名"他は"名姓"
        const purchaserName = (underName !== undefined)
            ? (res.locale === 'ja') ?
                `${underName.familyName} ${underName.givenName}` :
                `${underName.givenName} ${underName.familyName}`
            : '';
        debug('rendering template...');
        return new Promise((resolve, reject) => {
            res.render('email/reserve/complete', {
                layout: false,
                reservations: reservations,
                moment: moment,
                numeral: numeral,
                conf: conf,
                ticketInfoStr: ticketInfoStr,
                totalCharge: 0,
                dayTime: `${day} ${time}`,
                purchaserName: purchaserName
            }, (renderErr, text) => __awaiter(this, void 0, void 0, function* () {
                debug('email template rendered.', renderErr);
                if (renderErr instanceof Error) {
                    reject(new Error('failed in rendering an email.'));
                    return;
                }
                resolve({
                    sender: {
                        name: conf.get('email.fromname'),
                        email: conf.get('email.from')
                    },
                    toRecipient: {
                        name: purchaserName,
                        email: to
                    },
                    about: `${title} ${titleEmail}`,
                    text: text
                });
            }));
        });
    });
}
exports.createEmailAttributes = createEmailAttributes;
/**
 * チケット情報(券種ごとの枚数)取得
 */
function getTicketInfos(reservations) {
    // 券種ごとに合計枚数算出
    const ticketInfos = {};
    for (const reservation of reservations) {
        // チケットタイプセット
        const ticketType = reservation.reservedTicket.ticketType;
        let price = 0;
        if (ticketType.priceSpecification !== undefined) {
            price = ticketType.priceSpecification.price;
        }
        const dataValue = ticketType.identifier;
        // チケットタイプごとにチケット情報セット
        if (!ticketInfos.hasOwnProperty(dataValue)) {
            ticketInfos[dataValue] = {
                ticket_type_name: ticketType.name,
                charge: `\\${numeral(price).format('0,0')}`,
                watcher_name: reservation.additionalTicketText,
                count: 1
            };
        }
        else {
            ticketInfos[dataValue].count += 1;
        }
    }
    return ticketInfos;
}
exports.getTicketInfos = getTicketInfos;
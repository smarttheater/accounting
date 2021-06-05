"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancel = exports.search = void 0;
/**
 * 予約APIコントローラー
 */
const chevreapi = require("@chevre/api-nodejs-client");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const mypage_1 = require("../staff/mypage");
const debug = createDebug('@smarttheater/accounting:controllers');
const FRONTEND_CLIENT_IDS = (typeof process.env.FRONTEND_CLIENT_ID === 'string')
    ? process.env.FRONTEND_CLIENT_ID.split(',')
    : [];
const POS_CLIENT_IDS = (typeof process.env.POS_CLIENT_ID === 'string')
    ? process.env.POS_CLIENT_ID.split(',')
    : [];
const STAFF_CLIENT_IDS = [
    ...(typeof process.env.STAFF_CLIENT_IDS === 'string') ? process.env.STAFF_CLIENT_IDS.split(',') : [],
    ...(typeof process.env.API_CLIENT_ID === 'string') ? [process.env.API_CLIENT_ID] : [],
    ...(typeof process.env.API_CLIENT_ID_OLD === 'string') ? [process.env.API_CLIENT_ID_OLD] : []
];
/**
 * 予約検索
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function search(req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // バリデーション
        const errors = {};
        // 片方入力エラーチェック
        if (!isInputEven(req.query.start_hour1, req.query.start_minute1)) {
            errors.start_hour1 = { msg: '時分Fromが片方しか指定されていません' };
        }
        if (!isInputEven(req.query.start_hour2, req.query.start_minute2)) {
            errors.start_hour2 = { msg: '時分Toが片方しか指定されていません' };
        }
        if (Object.keys(errors).length > 0) {
            res.json({
                success: false,
                results: null,
                count: 0,
                errors: errors
            });
            return;
        }
        // tslint:disable-next-line:no-magic-numbers
        const limit = (typeof req.query.limit === 'string' && req.query.limit.length > 0) ? parseInt(req.query.limit, 10) : 10;
        // tslint:disable-next-line:no-magic-numbers
        const page = (typeof req.query.page === 'string' && req.query.page.length > 0) ? parseInt(req.query.page, 10) : 1;
        // ご来塔日時
        const day = (typeof req.query.day === 'string' && req.query.day.length > 0) ? req.query.day : null;
        const startHour1 = (typeof req.query.start_hour1 === 'string' && req.query.start_hour1.length > 0)
            ? req.query.start_hour1 : null;
        const startMinute1 = (typeof req.query.start_minute1 === 'string' && req.query.start_minute1.length > 0)
            ? req.query.start_minute1 : null;
        const startHour2 = (typeof req.query.start_hour2 === 'string' && req.query.start_hour2.length > 0)
            ? req.query.start_hour2 : null;
        const startMinute2 = (typeof req.query.start_minute2 === 'string' && req.query.start_minute2.length > 0)
            ? req.query.start_minute2 : null;
        // 購入番号
        const paymentNo = (typeof req.query.payment_no === 'string' && req.query.payment_no.length > 0)
            ? req.query.payment_no : null;
        // アカウント
        const owner = (typeof req.query.owner === 'string' && req.query.owner.length > 0) ? req.query.owner : null;
        // 予約方法
        const purchaserGroup = (typeof req.query.purchaser_group === 'string' && req.query.purchaser_group.length > 0)
            ? req.query.purchaser_group : null;
        // 決済手段
        const paymentMethod = (typeof req.query.payment_method === 'string' && req.query.payment_method.length > 0)
            ? req.query.payment_method : null;
        // 名前
        const purchaserLastName = (typeof req.query.purchaser_last_name === 'string' && req.query.purchaser_last_name.length > 0)
            ? req.query.purchaser_last_name : null;
        const purchaserFirstName = (typeof req.query.purchaser_first_name === 'string' && req.query.purchaser_first_name.length > 0)
            ? req.query.purchaser_first_name : null;
        // メアド
        const purchaserEmail = (typeof req.query.purchaser_email === 'string' && req.query.purchaser_email.length > 0)
            ? req.query.purchaser_email : null;
        // 電話番号
        const purchaserTel = (typeof req.query.purchaser_tel === 'string' && req.query.purchaser_tel.length > 0)
            ? req.query.purchaser_tel : null;
        // メモ
        const watcherName = (typeof req.query.watcher_name === 'string' && req.query.watcher_name.length > 0)
            ? req.query.watcher_name : null;
        // 検索条件を作成
        const startTimeFrom = (startHour1 !== null && startMinute1 !== null) ? startHour1 + startMinute1 : null;
        const startTimeTo = (startHour2 !== null && startMinute2 !== null) ? startHour2 + startMinute2 : null;
        let eventStartFrom;
        let eventStartThrough;
        if (day !== null) {
            // tslint:disable-next-line:no-magic-numbers
            const date = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
            eventStartFrom = moment(`${date}T00:00:00+09:00`).toDate();
            eventStartThrough = moment(eventStartFrom).add(1, 'day').toDate();
            if (startTimeFrom !== null) {
                // tslint:disable-next-line:no-magic-numbers
                eventStartFrom = moment(`${date}T${startTimeFrom.slice(0, 2)}:${startTimeFrom.slice(2, 4)}:00+09:00`)
                    .toDate();
            }
            if (startTimeTo !== null) {
                // tslint:disable-next-line:no-magic-numbers
                eventStartThrough = moment(`${date}T${startTimeTo.slice(0, 2)}:${startTimeTo.slice(2, 4)}:00+09:00`)
                    .add(1, 'second')
                    .toDate();
            }
        }
        const clientIds = [];
        switch (purchaserGroup) {
            case 'Customer':
                clientIds.push(...FRONTEND_CLIENT_IDS);
                break;
            case 'Staff':
                clientIds.push(...STAFF_CLIENT_IDS);
                break;
            case 'POS':
                clientIds.push(...POS_CLIENT_IDS);
                break;
            default:
        }
        const searchConditions = Object.assign({ limit: limit, page: page, sort: {
                'reservationFor.startDate': 1,
                reservationNumber: 1,
                'reservedTicket.ticketType.id': 1,
                'reservedTicket.ticketedSeat.seatNumber': 1
            }, typeOf: chevreapi.factory.reservationType.EventReservation, reservationStatuses: [chevreapi.factory.reservationStatusType.ReservationConfirmed], reservationFor: {
                startFrom: eventStartFrom,
                startThrough: eventStartThrough
            }, underName: {
                familyName: (purchaserLastName !== null)
                    ? { $regex: purchaserLastName, $options: 'i' }
                    : undefined,
                givenName: (purchaserFirstName !== null)
                    ? { $regex: purchaserFirstName, $options: 'i' }
                    : undefined,
                email: (purchaserEmail !== null)
                    ? { $regex: purchaserEmail, $options: 'i' }
                    : undefined,
                telephone: (purchaserTel !== null) ? `${purchaserTel}$` : undefined,
                identifier: Object.assign({ $all: [
                        // ...(owner !== null) ? [{ name: 'username', value: owner }] : [],
                        ...(paymentMethod !== null) ? [{ name: 'paymentMethod', value: paymentMethod }] : []
                    ], $in: [
                        ...clientIds.map((id) => {
                            return { name: 'clientId', value: id };
                        })
                    ] }, {
                    $elemMatch: (paymentNo !== null)
                        ? { name: 'paymentNo', value: { $regex: toHalfWidth(paymentNo.replace(/\s/g, '')) } }
                        : undefined
                })
            }, additionalTicketText: (watcherName !== null)
                ? { $regex: watcherName, $options: 'i' }
                : undefined }, {
            // brokerのusernameで検索
            broker: {
                identifier: {
                    $all: [
                        ...(owner !== null) ? [{ name: 'username', value: owner }] : []
                    ]
                }
            }
        });
        // Cinerinoでの予約検索
        debug('searching reservations...', searchConditions);
        const reservationService = new chevreapi.service.Reservation({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient,
            project: { id: String((_a = req.project) === null || _a === void 0 ? void 0 : _a.id) }
        });
        try {
            // 総数検索
            // データ検索(検索→ソート→指定ページ分切取り)
            const searchReservationsResult = yield reservationService.search(Object.assign(Object.assign({}, searchConditions), {
                countDocuments: '1'
            }));
            debug('searchReservationsResult by Cinerino:', searchReservationsResult);
            const count = searchReservationsResult.totalCount;
            debug('reservation count:', count);
            const reservations = searchReservationsResult.data;
            // 0件メッセージセット
            const message = (reservations.length === 0) ?
                '検索結果がありません。予約データが存在しないか、検索条件を見直してください' : '';
            const paymentMethods = yield mypage_1.searchPaymentMethodTypes(req);
            res.json({
                results: addCustomAttributes(reservations, paymentMethods),
                count: count,
                errors: null,
                message: message
            });
        }
        catch (error) {
            res.status(http_status_1.INTERNAL_SERVER_ERROR).json({
                errors: [{
                        message: error.message
                    }]
            });
        }
    });
}
exports.search = search;
function addCustomAttributes(reservations, paymentMethods) {
    return reservations.map((reservation) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        // 決済手段名称追加
        let paymentMethod4reservation = '';
        const paymentMethodProperty = (_c = (_b = (_a = reservation.underName) === null || _a === void 0 ? void 0 : _a.identifier) === null || _b === void 0 ? void 0 : _b.find((p) => p.name === 'paymentMethod')) === null || _c === void 0 ? void 0 : _c.value;
        if (typeof paymentMethodProperty === 'string') {
            paymentMethod4reservation = paymentMethodProperty;
        }
        let clientId = '';
        const clientIdProperty = (_f = (_e = (_d = reservation.underName) === null || _d === void 0 ? void 0 : _d.identifier) === null || _e === void 0 ? void 0 : _e.find((p) => p.name === 'clientId')) === null || _f === void 0 ? void 0 : _f.value;
        if (typeof clientIdProperty === 'string') {
            clientId = clientIdProperty;
        }
        // 購入番号
        let paymentNo = reservation.reservationNumber;
        const paymentNoProperty = (_j = (_h = (_g = reservation.underName) === null || _g === void 0 ? void 0 : _g.identifier) === null || _h === void 0 ? void 0 : _h.find((p) => p.name === 'paymentNo')) === null || _j === void 0 ? void 0 : _j.value;
        if (typeof paymentNoProperty === 'string') {
            paymentNo = paymentNoProperty;
        }
        // 注文番号
        let orderNumber = '';
        const orderNumberProperty = (_m = (_l = (_k = reservation.underName) === null || _k === void 0 ? void 0 : _k.identifier) === null || _l === void 0 ? void 0 : _l.find((p) => p.name === 'orderNumber')) === null || _m === void 0 ? void 0 : _m.value;
        if (typeof orderNumberProperty === 'string') {
            orderNumber = orderNumberProperty;
        }
        const underName = reservation.underName;
        // checkinsを旧chevre,cinerinoapiの両方のレスポンスに対応する
        let checkins = [];
        if (Array.isArray(reservation.checkins)) {
            checkins = reservation.checkins;
        }
        else {
            if (reservation.reservedTicket.dateUsed !== undefined && reservation.reservedTicket.dateUsed !== null) {
                // 数が正であればよいので、中身は適当に
                checkins = [{
                        when: new Date()
                        // where: '',
                        // why: '',
                        // how: ''
                    }];
            }
        }
        return Object.assign(Object.assign({}, reservation), { checkins, orderNumber: orderNumber, paymentNo: paymentNo, payment_method_name: (POS_CLIENT_IDS.indexOf(clientId) >= 0)
                ? '---'
                : paymentMethod2name(paymentMethod4reservation, paymentMethods), performance: reservation.reservationFor.id, 
            // performance_day: moment(reservation.reservationFor.startDate).tz('Asia/Tokyo').format('YYYYMMDD'),
            // performance_start_time: moment(reservation.reservationFor.startDate).tz('Asia/Tokyo').format('HHmm'),
            // performance_end_time: moment(reservation.reservationFor.endDate).tz('Asia/Tokyo').format('HHmm'),
            // performance_canceled: false,
            ticket_type_name: reservation.reservedTicket.ticketType.name, transactionAgentName: (STAFF_CLIENT_IDS.indexOf(clientId) >= 0)
                ? '窓口代理予約'
                : (POS_CLIENT_IDS.indexOf(clientId) >= 0) ? 'POS' : '一般ネット予約', purchaser_last_name: (typeof (underName === null || underName === void 0 ? void 0 : underName.familyName) === 'string') ? underName.familyName : '', purchaser_first_name: (typeof (underName === null || underName === void 0 ? void 0 : underName.givenName) === 'string') ? underName.givenName : '', purchaser_tel: (typeof (underName === null || underName === void 0 ? void 0 : underName.telephone) === 'string') ? underName.telephone : '', watcher_name: reservation.additionalTicketText });
    });
}
/**
 * 全角→半角変換
 */
function toHalfWidth(str) {
    return str.split('').map((value) => {
        // 全角であれば変換
        // tslint:disable-next-line:no-magic-numbers no-irregular-whitespace
        return value.replace(/[！-～]/g, String.fromCharCode(value.charCodeAt(0) - 0xFEE0)).replace('　', ' ');
    }).join('');
}
function paymentMethod2name(method, paymentMethods) {
    if (typeof paymentMethods[method] === 'string') {
        return paymentMethods[method];
    }
    return method;
}
/**
 * 両方入力チェック(両方入力、または両方未入力の時true)
 */
function isInputEven(value1, value2) {
    if ((typeof value1 !== 'string' || value1.length === 0)
        && (typeof value2 !== 'string' || value2.length === 0)) {
        return true;
    }
    if ((typeof value1 === 'string' && value1.length > 0)
        && (typeof value2 === 'string' && value2.length > 0)) {
        return true;
    }
    return false;
}
/**
 * キャンセル実行api
 */
function cancel(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (req.staffUser === undefined) {
            next(new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。'));
            return;
        }
        const successIds = [];
        const errorIds = [];
        try {
            const reservationIds = req.body.reservationIds;
            if (!Array.isArray(reservationIds)) {
                throw new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。');
            }
            // const reservationService = new cinerinoapi.service.Reservation({
            //     endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            //     auth: req.tttsAuthClient,
            //     project: { id: req.project?.id }
            // });
            const cancelReservationService = new chevreapi.service.assetTransaction.CancelReservation({
                endpoint: process.env.API_ENDPOINT,
                auth: req.tttsAuthClient,
                project: { id: String((_a = req.project) === null || _a === void 0 ? void 0 : _a.id) }
            });
            const promises = reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c, _d, _e, _f;
                // IDごとに予約取消
                try {
                    // await reservationService.cancel({
                    //     project: { typeOf: chevreapi.factory.organizationType.Project, id: '' }, // プロジェクト指定は実質無意味
                    //     typeOf: chevreapi.factory.assetTransactionType.CancelReservation,
                    //     agent: {
                    //         typeOf: chevreapi.factory.personType.Person,
                    //         id: String(req.session?.staffUser?.sub),
                    //         name: String(req.staffUser?.username)
                    //     },
                    //     object: {
                    //         reservation: { id }
                    //     },
                    //     expires: moment()
                    //         .add(1, 'minutes')
                    //         .toDate()
                    // });
                    yield cancelReservationService.startAndConfirm({
                        project: { typeOf: chevreapi.factory.organizationType.Project, id: String((_b = req.project) === null || _b === void 0 ? void 0 : _b.id) },
                        typeOf: chevreapi.factory.assetTransactionType.CancelReservation,
                        expires: moment()
                            .add(1, 'minute')
                            .toDate(),
                        agent: {
                            typeOf: chevreapi.factory.personType.Person,
                            id: String((_d = (_c = req.session) === null || _c === void 0 ? void 0 : _c.staffUser) === null || _d === void 0 ? void 0 : _d.sub),
                            name: `${(_e = req.staffUser) === null || _e === void 0 ? void 0 : _e.givenName} ${(_f = req.staffUser) === null || _f === void 0 ? void 0 : _f.familyName}`
                        },
                        object: {
                            reservation: { id }
                        }
                    });
                    successIds.push(id);
                }
                catch (error) {
                    errorIds.push(id);
                }
            }));
            yield Promise.all(promises);
            res.status(http_status_1.NO_CONTENT).end();
        }
        catch (error) {
            res.status(http_status_1.INTERNAL_SERVER_ERROR).json({
                message: error.message,
                successIds: successIds,
                errorIds: errorIds
            });
        }
    });
}
exports.cancel = cancel;

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
exports.updateOnlineStatus = exports.search = void 0;
/**
 * パフォーマンスAPIコントローラー
 */
const chevreapi = require("@chevre/api-nodejs-client");
const cinerinoapi = require("@cinerino/sdk");
const createDebug = require("debug");
const Email = require("email-templates");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const debug = createDebug('@smarttheater/accounting:controllers');
const POS_CLIENT_IDS = (typeof process.env.POS_CLIENT_ID === 'string')
    ? process.env.POS_CLIENT_ID.split(',')
    : [];
const FRONTEND_CLIENT_IDS = (typeof process.env.FRONTEND_CLIENT_ID === 'string')
    ? process.env.FRONTEND_CLIENT_ID.split(',')
    : [];
function getUnitPriceByAcceptedOffer(offer) {
    let unitPrice = 0;
    if (offer.priceSpecification !== undefined) {
        const priceSpecification = offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find((c) => c.typeOf === chevreapi.factory.priceSpecificationType.UnitPriceSpecification);
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    }
    return unitPrice;
}
/**
 * パフォーマンス検索
 */
function search(req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Cinerinoで検索
            // query:
            // page: 1,
            // day: ymd,
            // noTotalCount: '1',
            // useLegacySearch: '1'
            const day = String(req.query.day);
            const eventService = new cinerinoapi.service.Event({
                endpoint: process.env.CINERINO_API_ENDPOINT,
                auth: req.tttsAuthClient,
                project: { id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id }
            });
            const searchResult = yield eventService.search(Object.assign({ limit: 100, page: 1, typeOf: chevreapi.factory.eventType.ScreeningEvent, 
                // tslint:disable-next-line:no-magic-numbers
                startFrom: moment(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00+09:00`)
                    .toDate(), 
                // tslint:disable-next-line:no-magic-numbers
                startThrough: moment(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T23:59:59+09:00`)
                    .toDate() }, {
                $projection: { aggregateReservation: 0 }
            }));
            const performances = searchResult.data.map((event) => {
                var _a, _b, _c;
                // 一般座席の残席数に変更
                const remainingAttendeeCapacity = (_c = (_b = (_a = event.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.find((o) => o.identifier === '001')) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity;
                return Object.assign(Object.assign({}, event), { remainingAttendeeCapacity: (typeof remainingAttendeeCapacity === 'number') ? remainingAttendeeCapacity : '?' });
            });
            res.json({ data: performances });
        }
        catch (error) {
            res.status(http_status_1.INTERNAL_SERVER_ERROR)
                .json({
                message: error.message
            });
        }
    });
}
exports.search = search;
/**
 * 運行・オンライン販売ステータス変更
 */
// tslint:disable-next-line:max-func-body-length
function updateOnlineStatus(req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // パフォーマンスIDリストをjson形式で受け取る
            const performanceIds = req.body.performanceIds;
            if (!Array.isArray(performanceIds)) {
                throw new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。');
            }
            // パフォーマンス・予約(入塔記録のないもの)のステータス更新
            const evStatus = req.body.evStatus;
            const notice = req.body.notice;
            debug('updating performances...', performanceIds, evStatus, notice);
            // const now = new Date();
            // 返金対象注文情報取得
            const targetOrders = yield getTargetReservationsForRefund(req, performanceIds);
            const eventService = new cinerinoapi.service.Event({
                endpoint: process.env.CINERINO_API_ENDPOINT,
                auth: req.tttsAuthClient,
                project: { id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id }
            });
            const searchEventsResult = yield eventService.search(Object.assign({ limit: 100, typeOf: chevreapi.factory.eventType.ScreeningEvent }, {
                id: { $in: performanceIds }
            }));
            const updatingEvents = searchEventsResult.data;
            for (const updatingEvent of updatingEvents) {
                const performanceId = updatingEvent.id;
                let sendEmailMessageParams = [];
                // 運行停止の時(＜必ずオンライン販売停止・infoセット済)、Cinerinoにメール送信指定
                if (evStatus === chevreapi.factory.eventStatusType.EventCancelled) {
                    const targetOrders4performance = targetOrders.filter((o) => {
                        return o.acceptedOffers.some((offer) => {
                            const reservation = offer.itemOffered;
                            return reservation.typeOf === chevreapi.factory.reservationType.EventReservation
                                && reservation.reservationFor.id === performanceId;
                        });
                    });
                    sendEmailMessageParams = yield createEmails(targetOrders4performance, notice);
                }
                // Chevreイベントステータスに反映
                yield eventService.updatePartially(Object.assign({ id: performanceId, eventStatus: evStatus }, {
                    onUpdated: {
                        sendEmailMessage: sendEmailMessageParams
                    }
                }));
            }
            res.status(http_status_1.NO_CONTENT)
                .end();
        }
        catch (error) {
            res.status(http_status_1.INTERNAL_SERVER_ERROR)
                .json({
                message: error.message
            });
        }
    });
}
exports.updateOnlineStatus = updateOnlineStatus;
/**
 * 返金対象予約情報取得
 * [一般予約]かつ
 * [予約データ]かつ
 * [同一購入単位に入塔記録のない]予約のid配列
 */
// tslint:disable-next-line:max-func-body-length
function getTargetReservationsForRefund(req, performanceIds) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const orderService = new cinerinoapi.service.Order({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            auth: req.tttsAuthClient,
            project: { id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id }
        });
        const reservationService = new cinerinoapi.service.Reservation({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            auth: req.tttsAuthClient,
            project: { id: (_b = req.project) === null || _b === void 0 ? void 0 : _b.id }
        });
        let targetReservations = [];
        const limit4reservations = 100;
        let page4reservations = 0;
        let numData4reservations = limit4reservations;
        while (numData4reservations === limit4reservations) {
            page4reservations += 1;
            const searchReservationsResult = yield reservationService.search(Object.assign({ limit: limit4reservations, page: page4reservations, typeOf: chevreapi.factory.reservationType.EventReservation, reservationStatuses: [chevreapi.factory.reservationStatusType.ReservationConfirmed], 
                // クライアントがfrontend or pos
                underName: {
                    identifiers: [
                        ...POS_CLIENT_IDS.map((clientId) => {
                            return { name: 'clientId', value: clientId };
                        }),
                        ...FRONTEND_CLIENT_IDS.map((clientId) => {
                            return { name: 'clientId', value: clientId };
                        })
                    ]
                }, reservationFor: {
                    ids: performanceIds
                } }, {
                $projection: { underName: 1, reservedTicket: 1 }
            }));
            numData4reservations = searchReservationsResult.data.length;
            targetReservations.push(...searchReservationsResult.data);
        }
        targetReservations = targetReservations.filter((r) => {
            var _a, _b;
            return ((_a = r.reservedTicket) === null || _a === void 0 ? void 0 : _a.dateUsed) === undefined || ((_b = r.reservedTicket) === null || _b === void 0 ? void 0 : _b.dateUsed) === null;
        });
        const targetOrderNumbers = targetReservations.reduce((a, b) => {
            var _a;
            const underNameIdentifier = (_a = b.underName) === null || _a === void 0 ? void 0 : _a.identifier;
            if (Array.isArray(underNameIdentifier)) {
                const orderNumberProperty = underNameIdentifier.find((p) => p.name === 'orderNumber');
                if (orderNumberProperty !== undefined) {
                    a.push(orderNumberProperty.value);
                }
            }
            return a;
        }, []);
        // 全注文検索
        const orders = [];
        if (targetOrderNumbers.length > 0) {
            const limit = 10;
            let page = 0;
            let numData = limit;
            while (numData === limit) {
                page += 1;
                const searchOrdersResult = yield orderService.search({
                    limit: limit,
                    page: page,
                    orderNumbers: targetOrderNumbers
                });
                numData = searchOrdersResult.data.length;
                orders.push(...searchOrdersResult.data);
            }
        }
        return orders;
    });
}
/**
 * 運行・オンライン販売停止メール作成
 */
function createEmails(orders, notice) {
    return __awaiter(this, void 0, void 0, function* () {
        if (orders.length === 0) {
            return [];
        }
        return Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
            return createEmail(order, notice);
        })));
    });
}
/**
 * 運行・オンライン販売停止メール作成(1通)
 */
function createEmail(order, notice) {
    return __awaiter(this, void 0, void 0, function* () {
        const purchaserNameJp = `${order.customer.familyName} ${order.customer.givenName}`;
        const purchaserName = `${purchaserNameJp}様`;
        const purchaserNameEn = `Mr./Ms.${order.customer.name}`;
        const paymentTicketInfoText = createPaymentTicketInfoText(order);
        const email = new Email({
            views: { root: `${__dirname}/../../../../emails` },
            message: {},
            // uncomment below to send emails in development/test env:
            // send: true
            transport: {
                jsonTransport: true
            }
            // htmlToText: false
        });
        const content = yield email.render('updateEventStatus', {
            purchaserName,
            purchaserNameEn,
            notice,
            paymentTicketInfos: paymentTicketInfoText
        });
        // メール作成
        const emailMessage = {
            typeOf: chevreapi.factory.creativeWorkType.EmailMessage,
            identifier: `updateOnlineStatus-${order.orderNumber}`,
            name: `updateOnlineStatus-${order.orderNumber}`,
            sender: {
                typeOf: order.seller.typeOf,
                name: 'Tokyo Tower TOP DECK TOUR Online Ticket',
                email: process.env.EMAIL_SENDER
            },
            toRecipient: {
                typeOf: order.customer.typeOf,
                name: order.customer.name,
                email: order.customer.email
            },
            about: `東京タワートップデッキツアー中止のお知らせ Tokyo Tower Top Deck Tour Cancelled`,
            text: content
        };
        const purpose = {
            project: { typeOf: order.project.typeOf, id: order.project.id },
            typeOf: order.typeOf,
            seller: order.seller,
            customer: order.customer,
            confirmationNumber: order.confirmationNumber,
            orderNumber: order.orderNumber,
            price: order.price,
            priceCurrency: order.priceCurrency,
            orderDate: moment(order.orderDate)
                .toDate()
        };
        return {
            typeOf: chevreapi.factory.actionType.SendAction,
            agent: {
                typeOf: chevreapi.factory.personType.Person,
                id: ''
            },
            object: emailMessage,
            project: { typeOf: order.project.typeOf, id: order.project.id },
            purpose: purpose,
            recipient: {
                id: order.customer.id,
                name: emailMessage.toRecipient.name,
                typeOf: order.customer.typeOf
            }
        };
    });
}
function createPaymentTicketInfoText(order) {
    const reservation = order.acceptedOffers[0].itemOffered;
    // ご来塔日時 : 2017/12/10 09:15
    const event = reservation.reservationFor;
    const day = moment(event.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
    const time = moment(event.startDate).tz('Asia/Tokyo').format('HH:mm');
    // 購入番号
    const paymentNo = order.confirmationNumber;
    // 購入チケット情報
    const paymentTicketInfos = [];
    paymentTicketInfos.push(`購入番号 : ${paymentNo}`);
    paymentTicketInfos.push(`ご予約日時 : ${day} ${time}`);
    paymentTicketInfos.push(`券種 枚数`); // 券種 枚数
    const infos = getTicketInfo(order, 'ja'); // TOP DECKチケット(大人) 1枚
    paymentTicketInfos.push(infos.join('\n'));
    // 英語表記を追加
    paymentTicketInfos.push(''); // 日英の間の改行
    paymentTicketInfos.push(`Purchase Number : ${paymentNo}`);
    paymentTicketInfos.push(`Date/Time of Tour : ${day} ${time}`);
    paymentTicketInfos.push(`Ticket Type Quantity`);
    // TOP DECKチケット(大人) 1枚
    const infosEn = getTicketInfo(order, 'en');
    paymentTicketInfos.push(infosEn.join('\n'));
    return paymentTicketInfos.join('\n');
}
/**
 * チケット情報取得
 */
function getTicketInfo(order, locale) {
    const acceptedOffers = order.acceptedOffers;
    // チケットコード順にソート
    acceptedOffers.sort((a, b) => {
        if (a.itemOffered.reservedTicket.ticketType.identifier
            < b.itemOffered.reservedTicket.ticketType.identifier) {
            return -1;
        }
        if (a.itemOffered.reservedTicket.ticketType.identifier
            > b.itemOffered.reservedTicket.ticketType.identifier) {
            return 1;
        }
        return 0;
    });
    // 券種ごとに合計枚数算出
    const ticketInfos = {};
    for (const acceptedOffer of acceptedOffers) {
        // チケットタイプごとにチケット情報セット
        const reservation = acceptedOffer.itemOffered;
        const ticketType = reservation.reservedTicket.ticketType;
        const price = getUnitPriceByAcceptedOffer(acceptedOffer);
        if (ticketInfos[ticketType.identifier] === undefined) {
            ticketInfos[ticketType.identifier] = {
                ticket_type_name: ticketType.name[locale],
                charge: `\\${Number(price).toLocaleString('ja-JP')}`,
                count: 1
            };
        }
        else {
            ticketInfos[ticketType.identifier].count += 1;
        }
    }
    // 券種ごとの表示情報編集
    return Object.keys(ticketInfos).map((ticketTypeId) => {
        return `${ticketInfos[ticketTypeId].ticket_type_name} ${ticketInfos[ticketTypeId].count}枚`;
    });
}

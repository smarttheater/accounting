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
/**
 * 決済レポートルーター
 */
const alvercaapi = require("@alverca/sdk");
const express_1 = require("express");
const moment = require("moment-timezone");
const paymentReportsRouter = express_1.Router();
paymentReportsRouter.get('', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentReportsService = new alvercaapi.service.PaymentReport({
            endpoint: process.env.API_ENDPOINT,
            auth: req.tttsAuthClient,
            project: req.project
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page
        };
        if (req.query.format === 'datatable') {
            const conditions = Object.assign({ limit: Number(searchConditions.limit), page: Number(searchConditions.page), order: Object.assign(Object.assign({}, (typeof req.query.orderNumber === 'string' && req.query.orderNumber.length > 0)
                    ? { orderNumber: { $eq: req.query.orderNumber } }
                    : undefined), { paymentMethods: Object.assign({}, (typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                        ? { paymentMethodId: { $eq: req.query.paymentMethodId } }
                        : undefined), orderDate: {
                        $gte: (typeof req.query.orderDateRange === 'string' && req.query.orderDateRange.length > 0)
                            ? moment(req.query.orderDateRange.split(' - ')[0])
                                .toDate()
                            : undefined,
                        $lte: (typeof req.query.orderDateRange === 'string' && req.query.orderDateRange.length > 0)
                            ? moment(req.query.orderDateRange.split(' - ')[1])
                                .toDate()
                            : undefined
                    }, acceptedOffers: {
                        itemOffered: {
                            reservationFor: {
                                startDate: {
                                    $gte: (typeof req.query.reservationForStartRange === 'string'
                                        && req.query.reservationForStartRange.length > 0)
                                        ? moment(req.query.reservationForStartRange.split(' - ')[0])
                                            .toDate()
                                        : undefined,
                                    $lte: (typeof req.query.reservationForStartRange === 'string'
                                        && req.query.reservationForStartRange.length > 0)
                                        ? moment(req.query.reservationForStartRange.split(' - ')[1])
                                            .toDate()
                                        : undefined
                                }
                            }
                        }
                    } }) }, (req.query.unwindAcceptedOffers === 'on') ? { $unwindAcceptedOffers: '1' } : undefined);
            const searchResult = yield paymentReportsService.search(conditions);
            searchResult.data = searchResult.data.map((a) => {
                var _a, _b, _c, _d, _e, _f;
                let clientId = '';
                if (Array.isArray(a.order.customer.identifier)) {
                    const clientIdPropertyValue = (_a = a.order.customer.identifier.find((p) => p.name === 'clientId')) === null || _a === void 0 ? void 0 : _a.value;
                    if (typeof clientIdPropertyValue === 'string') {
                        clientId = clientIdPropertyValue;
                    }
                }
                let itemType = '';
                if (Array.isArray(a.order.acceptedOffers) && a.order.acceptedOffers.length > 0) {
                    itemType = a.order.acceptedOffers[0].itemOffered.typeOf;
                    itemType += ` x ${a.order.acceptedOffers.length}`;
                    // itemType = a.order.acceptedOffers.map((o) => o.itemOffered.typeOf)
                    //     .join(',');
                }
                else if (a.order.acceptedOffers !== undefined && typeof a.order.acceptedOffers.typeOf === 'string') {
                    itemType = a.order.acceptedOffers.itemOffered.typeOf;
                }
                if (a.typeOf === 'PayAction' && a.purpose.typeOf === 'ReturnAction') {
                    itemType = 'ReturnFee';
                }
                let amount;
                if (typeof ((_d = (_c = (_b = a.object) === null || _b === void 0 ? void 0 : _b.paymentMethod) === null || _c === void 0 ? void 0 : _c.totalPaymentDue) === null || _d === void 0 ? void 0 : _d.value) === 'number') {
                    amount = a.object.paymentMethod.totalPaymentDue.value;
                }
                let eventStartDates = [];
                if (Array.isArray(a.order.acceptedOffers)) {
                    eventStartDates = a.order.acceptedOffers
                        .filter((o) => o.itemOffered.typeOf === alvercaapi.factory.chevre.reservationType.EventReservation)
                        .map((o) => o.itemOffered.reservationFor.startDate);
                    eventStartDates = [...new Set(eventStartDates)];
                }
                else if (((_f = (_e = a.order.acceptedOffers) === null || _e === void 0 ? void 0 : _e.itemOffered) === null || _f === void 0 ? void 0 : _f.typeOf) === alvercaapi.factory.chevre.reservationType.EventReservation) {
                    eventStartDates = [a.order.acceptedOffers.itemOffered.reservationFor.startDate];
                }
                return Object.assign(Object.assign({}, a), { amount,
                    itemType,
                    eventStartDates, order: Object.assign(Object.assign({}, a.order), { customer: Object.assign(Object.assign({}, a.order.customer), { clientId }) }) });
            });
            res.json({
                draw: req.query.draw,
                // recordsTotal: searchOrdersResult.totalCount,
                recordsFiltered: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                data: searchResult.data
            });
            // } else if (req.query.format === cinerinoapi.factory.chevre.encodingFormat.Text.csv) {
            //     const stream = <NodeJS.ReadableStream>await streamingOrderService.download({
            //         ...searchConditions,
            //         format: cinerinoapi.factory.chevre.encodingFormat.Text.csv,
            //         limit: undefined,
            //         page: undefined
            //     });
            //     const filename = 'OrderReport';
            //     res.setHeader('Content-disposition', `attachment; filename*=UTF-8\'\'${encodeURIComponent(`${filename}.csv`)}`);
            //     res.setHeader('Content-Type', `${cinerinoapi.factory.chevre.encodingFormat.Text.csv}; charset=UTF-8`);
            //     stream.pipe(res);
            // } else if (req.query.format === cinerinoapi.factory.chevre.encodingFormat.Application.json) {
            //     const stream = <NodeJS.ReadableStream>await streamingOrderService.download({
            //         ...searchConditions,
            //         format: cinerinoapi.factory.chevre.encodingFormat.Application.json,
            //         limit: undefined,
            //         page: undefined
            //     });
            //     const filename = 'OrderReport';
            //     res.setHeader('Content-disposition', `attachment; filename*=UTF-8\'\'${encodeURIComponent(`${filename}.json`)}`);
            //     res.setHeader('Content-Type', `${cinerinoapi.factory.chevre.encodingFormat.Application.json}; charset=UTF-8`);
            //     stream.pipe(res);
        }
        else {
            res.render('paymentReports/index', {
                moment: moment,
                query: req.query,
                searchConditions: searchConditions,
                extractScripts: true
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
exports.default = paymentReportsRouter;

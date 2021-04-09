/**
 * 経理レポートルーター
 */
import * as alvercaapi from '@alverca/sdk';
import * as cinerinoapi from '@cinerino/sdk';
import { Router } from 'express';
import * as moment from 'moment-timezone';

export type IAction = cinerinoapi.factory.chevre.action.trade.pay.IAction | cinerinoapi.factory.chevre.action.trade.refund.IAction;
export type IPaymentReport = IAction & {
    isPartOf: {
        mainEntity: cinerinoapi.factory.order.IOrder;
    };
};

const accountingReportsRouter = Router();

accountingReportsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const accountingReportService = new alvercaapi.service.AccountingReport({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.tttsAuthClient,
                project: req.project
            });

            const searchConditions: any = {
                limit: req.query.limit,
                page: req.query.page
            };

            if (req.query.format === 'datatable') {
                const conditions: any = {
                    limit: Number(searchConditions.limit),
                    page: Number(searchConditions.page),
                    order: {
                        ...(typeof req.query.orderNumber === 'string' && req.query.orderNumber.length > 0)
                            ? { orderNumber: { $eq: req.query.orderNumber } }
                            : undefined,
                        paymentMethods: {
                            ...(typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                                ? { paymentMethodId: { $eq: req.query.paymentMethodId } }
                                : undefined
                        },
                        orderDate: {
                            $gte: (typeof req.query.orderDateRange === 'string' && req.query.orderDateRange.length > 0)
                                ? moment(req.query.orderDateRange.split(' - ')[0])
                                    .toDate()
                                : undefined,
                            $lte: (typeof req.query.orderDateRange === 'string' && req.query.orderDateRange.length > 0)
                                ? moment(req.query.orderDateRange.split(' - ')[1])
                                    .toDate()
                                : undefined
                        },
                        acceptedOffers: {
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
                        }
                    },
                    ...(req.query.unwindAcceptedOffers === 'on') ? { $unwindAcceptedOffers: '1' } : undefined
                };
                const searchResult = await accountingReportService.search(conditions);

                searchResult.data = (<IPaymentReport[]>searchResult.data).map((a) => {
                    const order = a.isPartOf.mainEntity;

                    let clientId = '';
                    if (Array.isArray(order.customer.identifier)) {
                        const clientIdPropertyValue = order.customer.identifier.find((p) => p.name === 'clientId')?.value;
                        if (typeof clientIdPropertyValue === 'string') {
                            clientId = clientIdPropertyValue;
                        }
                    }

                    let itemType: string[] = [];
                    let itemTypeStr: string = '';
                    if (Array.isArray(order.acceptedOffers) && order.acceptedOffers.length > 0) {
                        itemTypeStr = order.acceptedOffers[0].itemOffered.typeOf;
                        itemTypeStr += ` x ${order.acceptedOffers.length}`;
                        itemType = order.acceptedOffers.map((o) => o.itemOffered.typeOf);
                    } else if (order.acceptedOffers !== undefined && typeof (<any>order).typeOf === 'string') {
                        itemType = [(<any>order).itemOffered.typeOf];
                        itemTypeStr = (<any>order).itemOffered.typeOf;
                    }
                    if (a.typeOf === 'PayAction' && a.purpose.typeOf === 'ReturnAction') {
                        itemType = ['ReturnFee'];
                        itemTypeStr = 'ReturnFee';
                    }

                    let amount;
                    if (typeof (<any>a).object?.paymentMethod?.totalPaymentDue?.value === 'number') {
                        amount = (<any>a).object.paymentMethod.totalPaymentDue.value;
                    }

                    let eventStartDates: any[] = [];
                    if (Array.isArray(order.acceptedOffers)) {
                        eventStartDates = order.acceptedOffers
                            .filter((o) => o.itemOffered.typeOf === alvercaapi.factory.chevre.reservationType.EventReservation)
                            .map((o) => (<cinerinoapi.factory.order.IReservation>o.itemOffered).reservationFor.startDate);
                        eventStartDates = [...new Set(eventStartDates)];
                    } else if ((<any>order.acceptedOffers)?.itemOffered?.typeOf
                        === alvercaapi.factory.chevre.reservationType.EventReservation) {
                        eventStartDates = [(<any>order.acceptedOffers).itemOffered.reservationFor.startDate];
                    }

                    return {
                        ...a,
                        amount,
                        itemType,
                        itemTypeStr,
                        eventStartDates,
                        clientId
                    };
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
            } else {
                res.render('accountingReports/index', {
                    moment: moment,
                    query: req.query,
                    searchConditions: searchConditions,
                    extractScripts: true
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

export default accountingReportsRouter;

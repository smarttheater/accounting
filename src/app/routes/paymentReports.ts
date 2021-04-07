/**
 * 決済レポートルーター
 */
import * as alvercaapi from '@alverca/sdk';
import { Router } from 'express';
import * as moment from 'moment-timezone';

const paymentReportsRouter = Router();

paymentReportsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const paymentReportsService = new alvercaapi.service.PaymentReport({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.tttsAuthClient,
                project: req.project
            });

            const searchConditions: any = {
                limit: req.query.limit,
                page: req.query.page
            };

            if (req.query.format === 'datatable') {
                const searchResult = await paymentReportsService.search({
                    limit: Number(searchConditions.limit),
                    page: Number(searchConditions.page),
                    ...(req.query.unwindAcceptedOffers === 'on') ? { $unwindAcceptedOffers: '1' } : undefined
                });

                searchResult.data = searchResult.data.map((a) => {
                    let clientId = '';
                    if (Array.isArray(a.order.customer.identifier)) {
                        const clientIdProperty = (<any[]>a.order.customer.identifier).find((p) => p.name === 'clientId');
                        if (clientIdProperty !== undefined) {
                            clientId = clientIdProperty.value;
                        }
                    }

                    let itemType = '';
                    if (Array.isArray(a.order.acceptedOffers) && a.order.acceptedOffers.length > 0) {
                        itemType = a.order.acceptedOffers[0].itemOffered.typeOf;
                    } else if (a.order.acceptedOffers !== undefined && typeof a.order.acceptedOffers.typeOf === 'string') {
                        itemType = a.order.acceptedOffers.itemOffered.typeOf;
                    }
                    if (a.typeOf === 'PayAction' && a.purpose.typeOf === 'ReturnAction') {
                        itemType = 'ReturnFee';
                    }

                    let amount;
                    if (typeof a.object?.paymentMethod?.totalPaymentDue?.value === 'number') {
                        amount = a.object.paymentMethod.totalPaymentDue.value;
                    }

                    let eventStartDates: any[] = [];
                    if (Array.isArray(a.order.acceptedOffers)) {
                        eventStartDates = (<any[]>a.order.acceptedOffers)
                            .filter((o) => o.itemOffered.typeOf === alvercaapi.factory.chevre.reservationType.EventReservation)
                            .map((o) => o.itemOffered.reservationFor.startDate);
                        eventStartDates = [...new Set(eventStartDates)];
                    } else if (a.order.acceptedOffers?.itemOffered?.typeOf === alvercaapi.factory.chevre.reservationType.EventReservation) {
                        eventStartDates = [a.order.acceptedOffers.itemOffered.reservationFor.startDate];
                    }

                    return {
                        ...a,
                        amount,
                        itemType,
                        eventStartDates,
                        order: {
                            ...a.order,
                            customer: {
                                ...a.order.customer,
                                // ...(Array.isArray(a.order.customer.additionalProperty))
                                //     ? { additionalProperty: JSON.stringify(a.order.customer.additionalProperty) }
                                //     : undefined,
                                clientId
                            },
                            numItems: a.order.acceptedOffers.length
                        }
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
                res.render('paymentReports/index', {
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

export default paymentReportsRouter;

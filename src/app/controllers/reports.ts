/**
 * レポート出力コントローラー
 */
import { chevre as chevreapi } from '@cinerino/sdk';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

const debug = createDebug('@smarttheater/accounting:controllers');

const RESERVATION_START_DATE = process.env.RESERVATION_START_DATE;

// tslint:disable-next-line:max-func-body-length
export async function search(req: Request, res: Response): Promise<void> {
    debug('query:', req.query);
    const dateFrom = getValue(req.query.dateFrom);
    const dateTo = getValue(req.query.dateTo);
    const eventStartFrom = getValue(req.query.eventStartFrom);
    const eventStartThrough = getValue(req.query.eventStartThrough);
    const conditions: any[] = [];

    try {
        if (dateFrom !== null || dateTo !== null) {
            const minEndFrom =
                (RESERVATION_START_DATE !== undefined) ? moment(RESERVATION_START_DATE) : moment('2017-01-01T00:00:00Z');
            // 登録日From
            if (dateFrom !== null) {
                // 売上げ
                const endFrom = moment(`${getValue(req.query.dateFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
                conditions.push({
                    dateRecorded: {
                        $gte: moment.max(endFrom, minEndFrom)
                            .toDate()
                    }
                });
            }
            // 登録日To
            if (dateTo !== null) {
                // 売上げ
                conditions.push({
                    dateRecorded: {
                        $lt: moment(`${dateTo}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .add(1, 'days')
                            .toDate()
                    }
                });
            }
        }
        if (eventStartFrom !== null) {
            conditions.push({
                'reservation.reservationFor.startDate': {
                    $exists: true,
                    $gte: moment(`${eventStartFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                }
            });
        }
        if (eventStartThrough !== null) {
            conditions.push({
                'reservation.reservationFor.startDate': {
                    $exists: true,
                    $lt: moment(`${eventStartThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                }
            });
        }

        const categoryEq = req.query.category;
        if (typeof categoryEq === 'string' && categoryEq.length > 0) {
            conditions.push({
                category: { $eq: categoryEq }
            });
        }

        const confirmationNumberEq = req.query.confirmationNumber;
        if (typeof confirmationNumberEq === 'string' && confirmationNumberEq.length > 0) {
            conditions.push({
                'mainEntity.confirmationNumber': { $exists: true, $eq: confirmationNumberEq }
            });
        }

        const customerGroupEq = req.query.customer?.group;
        if (typeof customerGroupEq === 'string' && customerGroupEq.length > 0) {
            conditions.push({
                'mainEntity.customer.group': { $exists: true, $eq: customerGroupEq }
            });
        }

        const reservationForIdEq = req.query.reservation?.reservationFor?.id;
        if (typeof reservationForIdEq === 'string' && reservationForIdEq.length > 0) {
            conditions.push({
                'reservation.reservationFor.id': { $exists: true, $eq: reservationForIdEq }
            });
        }

        const reservationIdEq = req.query.reservation?.id;
        if (typeof reservationIdEq === 'string' && reservationIdEq.length > 0) {
            conditions.push({
                'reservation.id': { $exists: true, $eq: reservationIdEq }
            });
        }

        const aggregateSalesService = new chevreapi.service.SalesReport({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.tttsAuthClient,
            project: { id: String(req.project?.id) }
        });

        const searchResult = await aggregateSalesService.search({
            $and: conditions,
            ...{
                limit: Number(req.query.limit),
                page: Number(req.query.page)
            }
        });

        res.header('X-Total-Count', '0');
        res.json(searchResult.data);
    } catch (error) {
        res.send(error.message);
    }
}

export enum ReportType {
    Sales = 'Sales'
}

/**
 * 売上レポート検索
 */
// tslint:disable-next-line:max-func-body-length
export async function getAggregateSales(req: Request, res: Response): Promise<void> {
    debug('query:', req.query);
    const dateFrom = getValue(req.query.dateFrom);
    const dateTo = getValue(req.query.dateTo);
    const eventStartFrom = getValue(req.query.eventStartFrom);
    const eventStartThrough = getValue(req.query.eventStartThrough);
    const conditions: any[] = [
        { 'project.id': { $exists: true, $eq: req.project?.id } }
    ];

    try {
        switch (req.query.reportType) {
            case ReportType.Sales:
                break;

            default:
                throw new Error(`${req.query.reportType}は非対応レポートタイプです`);
        }

        if (dateFrom !== null || dateTo !== null) {
            const minEndFrom =
                (RESERVATION_START_DATE !== undefined) ? moment(RESERVATION_START_DATE) : moment('2017-01-01T00:00:00Z');
            // 登録日From
            if (dateFrom !== null) {
                // 売上げ
                const endFrom = moment(`${getValue(req.query.dateFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ');
                conditions.push({
                    dateRecorded: {
                        $gte: moment.max(endFrom, minEndFrom)
                            .toDate()
                    }
                });
            }
            // 登録日To
            if (dateTo !== null) {
                // 売上げ
                conditions.push({
                    dateRecorded: {
                        $lt: moment(`${dateTo}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .add(1, 'days')
                            .toDate()
                    }
                });
            }
        }
        if (eventStartFrom !== null) {
            conditions.push({
                'reservation.reservationFor.startDate': {
                    $exists: true,
                    $gte: moment(`${eventStartFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                }
            });
        }
        if (eventStartThrough !== null) {
            conditions.push({
                'reservation.reservationFor.startDate': {
                    $exists: true,
                    $lt: moment(`${eventStartThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                }
            });
        }

        if (req.query.format === 'json') {
            const aggregateSalesService = new chevreapi.service.SalesReport({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.tttsAuthClient,
                project: { id: String(req.project?.id) }
            });

            const searchResult = await aggregateSalesService.search({
                $and: conditions,
                ...{ limit: Number(req.query.limit), page: Number(req.query.page) }
            });

            res.json({
                results: searchResult.data.map((doc) => {
                    const eventDate = moment(doc.reservation.reservationFor.startDate)
                        .toDate();
                    const dateRecorded: string = // 万が一入塔予約日時より明らかに後であれば、間違ったデータなので調整
                        (moment(doc.dateRecorded)
                            .isAfter(moment(eventDate)
                                .add(1, 'hour')))
                            ? moment(doc.dateRecorded)
                                // tslint:disable-next-line:no-magic-numbers
                                .add(-9, 'hours')
                                .tz('Asia/Tokyo')
                                .format('YYYY/MM/DD HH:mm:ss')
                            : moment(doc.dateRecorded)
                                .tz('Asia/Tokyo')
                                .format('YYYY/MM/DD HH:mm:ss');

                    const dateUsed = doc.reservation.reservedTicket?.dateUsed;
                    const attended = dateUsed !== undefined && dateUsed !== null;
                    const attendDate: string = // 万が一入塔予約日時より明らかに前であれば、間違ったデータなので調整
                        (attended)
                            ? (moment(dateUsed)
                                .isBefore(moment(eventDate)
                                    // tslint:disable-next-line:no-magic-numbers
                                    .add(-3, 'hour')))
                                ? moment(dateUsed)
                                    // tslint:disable-next-line:no-magic-numbers
                                    .add(9, 'hours')
                                    .tz('Asia/Tokyo')
                                    .format('YYYY/MM/DD HH:mm:ss')
                                : moment(dateUsed)
                                    .tz('Asia/Tokyo')
                                    .format('YYYY/MM/DD HH:mm:ss')
                            : '';

                    let seatNumber = doc.reservation?.reservedTicket?.ticketedSeat?.seatNumber;
                    let ticketTypeName = doc.reservation?.reservedTicket?.ticketType?.name?.ja;
                    let csvCode = doc.reservation?.reservedTicket?.ticketType?.csvCode;
                    let unitPrice = (typeof doc.reservation?.reservedTicket?.ticketType?.priceSpecification?.price === 'number')
                        ? String(doc.reservation?.reservedTicket?.ticketType?.priceSpecification?.price)
                        : '';
                    let paymentSeatIndex = (typeof doc.payment_seat_index === 'string' || typeof doc.payment_seat_index === 'number')
                        ? String(doc.payment_seat_index)
                        : '';
                    // 返品手数料の場合、値を調整
                    if (doc.category === chevreapi.factory.report.order.ReportCategory.CancellationFee) {
                        seatNumber = '';
                        ticketTypeName = '';
                        csvCode = '';
                        unitPrice = String(doc.amount);
                        paymentSeatIndex = '';
                    }

                    return {
                        ...doc,
                        dateRecorded,
                        attended: (attended) ? 'TRUE' : 'FALSE',
                        attendDate,
                        seatNumber,
                        ticketTypeName,
                        csvCode,
                        unitPrice,
                        paymentSeatIndex,
                        reservationForStartDay: moment(doc.reservation.reservationFor.startDate)
                            .tz('Asia/Tokyo')
                            .format('YYYYMMDD'),
                        reservationForStartTime: moment(doc.reservation.reservationFor.startDate)
                            .tz('Asia/Tokyo')
                            .format('HHmm')
                    };
                })
            });
        } else {
            throw new Error(`format ${req.query.format} not implemented`);
        }
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR)
            .json({ error: { message: error.message } });
        // res.send(error.message);
    }
}

/**
 * 入力値取得(空文字はnullに変換)
 * @param {string|null} inputValue
 * @returns {string|null}
 */
function getValue(inputValue: string | null): string | null {
    // tslint:disable-next-line:no-null-keyword
    return (typeof inputValue === 'string' && inputValue.length > 0) ? inputValue : null;
}

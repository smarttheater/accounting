/**
 * 運行・オンライン販売停止一覧コントローラー
 */
import * as cinerinoaapi from '@cinerino/sdk';

import { NextFunction, Request, Response } from 'express';

const layout: string = 'layouts/staff/layout';

/**
 * スケジュール選択
 */
export async function performances(__: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // 運行・オンライン販売停止設定画面表示
        res.render('staff/suspension/performances', {
            layout: layout,
            EventStatusType: cinerinoaapi.factory.chevre.eventStatusType
        });
    } catch (error) {
        next(new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。'));
    }
}

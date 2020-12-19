"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーティング
 */
// import * as conf from 'config';
// import { Request, Response, Router } from 'express';
const express_1 = require("express");
const languageController = require("../controllers/language");
const api_1 = require("./api");
const checkin_1 = require("./checkin");
const reports_1 = require("./reports");
const staff_1 = require("./staff");
const DEFAULT_CALLBACK = process.env.DEFAULT_CALLBACK;
// 本体サイトのトップページの言語別URL
// const topUrlByLocale = conf.get<any>('official_url_top_by_locale');
// 本体サイトのFAQページの言語別URL
// const faqUrlByLocale = conf.get<any>('official_url_faq_by_locale');
// 本体サイトのチケット案内ページの言語別URL
// const ticketInfoUrlByLocale = conf.get<any>('official_url_ticketinfo_by_locale');
// 本体サイトの入場案内ページの言語別URL
// const aboutEnteringUrlByLocale = conf.get<any>('official_url_aboutentering_by_locale');
// 本体サイトの車椅子詳細案内ページの言語別URL
// const wheelchairInfoUrlByLocale = conf.get<any>('official_url_wheelchairinfo_by_locale');
// 本体サイトのプライバシーポリシーページの言語別URL
// const privacyPolicyUrlByLocale = conf.get<any>('official_url_privacypolicy_by_locale');
// 本体サイトのお問い合わせページの言語別URL
// const contactUrlByLocale = conf.get<any>('official_url_contact_by_locale');
// 言語ごとの対象ページリダイレクト用URLを得る (その言語のURLが無かった場合は英語版を返す)
// const getRedirectOfficialUrl = (req: Request, urlByLocale: any): string => {
//     const locale: string = (typeof req.getLocale() === 'string' && req.getLocale() !== '') ? req.getLocale() : 'en';
//     return (urlByLocale[locale] !== undefined) ? urlByLocale[locale] : urlByLocale.en;
// };
const router = express_1.Router();
// デフォルトトップページ
router.get('/', (_, res, next) => {
    if (typeof DEFAULT_CALLBACK === 'string' && DEFAULT_CALLBACK.length > 0) {
        res.redirect(DEFAULT_CALLBACK);
        return;
    }
    next();
});
router.use('/api', api_1.default);
router.use('/staff', staff_1.default);
router.use('/reports', reports_1.default); //レポート出力
// 言語
router.get('/language/update/:locale', languageController.update);
// 入場
router.use('/checkin', checkin_1.default);
// 利用規約ページ
// router.get('/terms/', (req: Request, res: Response) => {
//     res.locals.req = req;
//     res.locals.conf = conf;
//     res.locals.validation = null;
//     res.locals.title = 'Tokyo Tower';
//     res.locals.description = 'TTTS Terms';
//     res.locals.keywords = 'TTTS Terms';
//     res.render('common/terms/');
// });
// 特定商取引法に基づく表示ページ
// router.get('/asct/', (req: Request, res: Response) => {
//     res.locals.req = req;
//     res.locals.conf = conf;
//     res.locals.validation = null;
//     res.locals.title = 'Tokyo Tower';
//     res.locals.description = 'TTTS Act on Specified Commercial Transactions';
//     res.locals.keywords = 'TTTS Act on Specified Commercial Transactions';
//     res.render('common/asct/');
// });
// 本体サイトのFAQページに転送
// router.get('/faq', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, faqUrlByLocale));
// });
// 本体サイトのチケット案内ページに転送
// router.get('/ticketinfo', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, ticketInfoUrlByLocale));
// });
// 本体サイトの入場案内ページの対応言語版に転送
// router.get('/aboutenter', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, aboutEnteringUrlByLocale));
// });
// 本体サイトの車椅子詳細案内ページの対応言語版に転送
// router.get('/wheelchairinfo', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, wheelchairInfoUrlByLocale));
// });
// 本体サイトのプライバシーポリシーページの対応言語版に転送
// router.get('/privacypolicy', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, privacyPolicyUrlByLocale));
// });
// 本体サイトのお問い合わせページの対応言語版に転送
// router.get('/contact', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, contactUrlByLocale));
// });
// 本体サイトトップページの対応言語版に転送
// router.get('/returntop', (req: Request, res: Response) => {
//     res.redirect(getRedirectOfficialUrl(req, topUrlByLocale));
// });
exports.default = router;

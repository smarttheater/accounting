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
exports.performances = void 0;
/**
 * 運行・オンライン販売停止一覧コントローラー
 */
const chevreapi = require("@chevre/api-nodejs-client");
const layout = 'layouts/staff/layout';
/**
 * スケジュール選択
 */
function performances(__, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 運行・オンライン販売停止設定画面表示
            res.render('staff/suspension/performances', {
                layout: layout,
                EventStatusType: chevreapi.factory.eventStatusType
            });
        }
        catch (error) {
            next(new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。'));
        }
    });
}
exports.performances = performances;

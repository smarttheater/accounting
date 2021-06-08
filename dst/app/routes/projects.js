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
 * プロジェクトルーター
 */
const express = require("express");
const home_1 = require("./home");
const projectsRouter = express.Router();
projectsRouter.all('/:id/*', (req, _, next) => __awaiter(void 0, void 0, void 0, function* () {
    req.project = { id: req.params.id };
    next();
}));
projectsRouter.get('/:id/logo', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    const logo = 'https://s3-ap-northeast-1.amazonaws.com/cinerino/logos/cinerino.png';
    res.redirect(logo);
}));
projectsRouter.use('/:id/home', home_1.default);
exports.default = projectsRouter;

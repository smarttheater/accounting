/**
 * 内部関係者ログインフォーム
 *
 * @ignore
 */

import { Request } from 'express';

//  const SIGNATURE_MAX_LENGTH = 10;

export default (req: Request) => {
    // userId
    req.checkBody('userId', req.__('NoInput{{fieldName}}', { fieldName: req.__('Form.FieldName.userId') })).notEmpty();

    // password
    req.checkBody('password', req.__('NoInput{{fieldName}}', { fieldName: req.__('Form.FieldName.password') })).notEmpty();

    // language
    req.checkBody('language', req.__('NoInput{{fieldName}}', { fieldName: req.__('Form.FieldName.language') })).notEmpty();
};

/**
 * 販売停止パフォーマンスAPIコントローラー
 */
if (process.env.API_CLIENT_ID === undefined) {
    throw new Error('Please set an environment variable \'API_CLIENT_ID\'');
}

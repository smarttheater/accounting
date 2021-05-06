$(function () {
    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    });

    // 売上レポート出力ボタンイベント
    $(document).on('click', '.form-salesReport .btn-download', function () {
        // サーバー側でストリーミングする場合はこちら
        // streamReports();

        // クライアントサイドで処理する場合はこちら
        onClickDownload();
    });
});

function streamReports() {
    var form = $('.form-salesReport');
    // now:キャッシュ避け
    var now = (new Date()).getTime();
    var url = '/reports/getAggregateSales?' + form.serialize() + '&dummy=' + now;
    console.log('[donwload] salesReport', url);
    window.open(url);
}

async function onClickDownload() {
    var conditions4csv = {};
    // 指定フォームの値を全て条件に追加
    $('.form-salesReport').serializeArray().forEach(function (formData, index) {
        conditions4csv[formData.name] = formData.value;
    });
    var now = (new Date()).getTime();

    console.log('downloaing...');
    // this.utilService.loadStart({ process: 'load' });
    // var notify = $.notify({
    //     message: '予約ダウンロードを開始します...',
    // }, {
    //     type: 'primary',
    //     delay: 300
    // });

    // 全ページ検索する
    $('.loading').modal();
    const datas = [];
    let page = 0;
    var limit = 100;
    while (true) {
        page += 1;
        conditions4csv.page = page;
        conditions4csv.limit = limit;
        console.log('searching reports...', conditions4csv.limit, conditions4csv.page);
        // $.notify({
        //     message: page + 'ページ目を検索しています...',
        // }, {
        //     type: 'primary',
        //     delay: 300
        // });

        var searchResult;
        try {
            searchResult = await new Promise((resolve, reject) => {
                $.ajax({
                    url: '/reports/getAggregateSales?&dummy=' + now + '&format=json',
                    cache: false,
                    type: 'GET',
                    dataType: 'json',
                    data: conditions4csv,
                    // data: {
                    //     // limit,
                    //     page,
                    //     format: 'datatable'
                    // }
                    beforeSend: function () {
                    }
                }).done(function (result) {
                    console.log('searched.', result);
                    resolve(result);
                }).fail(function (xhr) {
                    var res = JSON.parse(xhr.responseText);
                    reject(new Error(res.error.message));
                }).always(function () {
                });
            });
        } catch (error) {
            console.error(error);
            alert('ダウンロードを中断しました。再度お試しください。' + error.message);

            $('.loading').modal('hide');

            return;
        }

        if (Array.isArray(searchResult.results)) {
            searchResult.results.forEach(function (report) {
                datas.push(report);
            });
        }

        if (searchResult.results.length < conditions4csv.limit) {
            break;
        }
    }

    $('.loading').modal('hide');

    console.log(datas.length, 'reports found');
    // $.notify({
    //     message: datas.length + '件の予約が見つかりました',
    // }, {
    //     type: 'primary',
    //     delay: 2000
    // });

    const fields = [
        { label: '購入番号', default: '', value: 'mainEntity.confirmationNumber' },
        { label: 'パフォーマンスID', default: '', value: 'reservation.reservationFor.id' },
        { label: '座席コード', default: '', value: 'seatNumber' },
        { label: '予約ステータス', default: '', value: 'category' },
        { label: '入塔予約年月日', default: '', value: 'reservationForStartDay' },
        { label: '入塔予約時刻', default: '', value: 'reservationForStartTime' },
        { label: '---a', default: '', value: 'dummyField' },
        { label: '---b', default: '', value: 'dummyField' },
        { label: '---c', default: '', value: 'dummyField' },
        { label: '---d', default: '', value: 'dummyField' },
        { label: '---e', default: '', value: 'dummyField' },
        { label: '購入者区分', default: '', value: 'mainEntity.customer.group' },
        { label: '購入者（名）', default: '', value: 'mainEntity.customer.givenName' },
        { label: '購入者（姓）', default: '', value: 'mainEntity.customer.familyName' },
        { label: '購入者メール', default: '', value: 'mainEntity.customer.email' },
        { label: '購入者電話', default: '', value: 'mainEntity.customer.telephone' },
        { label: '購入日時', default: '', value: 'dateRecorded' },
        { label: '決済方法', default: '', value: 'mainEntity.paymentMethod' },
        { label: '---f', default: '', value: 'dummyField' },
        { label: '---g', default: '', value: 'dummyField' },
        { label: '券種名称', default: '', value: 'ticketTypeName' },
        { label: 'チケットコード', default: '', value: 'csvCode' },
        { label: '券種料金', default: '', value: 'unitPrice' },
        { label: '客層', default: '', value: 'mainEntity.customer.segment' },
        { label: 'payment_seat_index', default: '', value: 'paymentSeatIndex' },
        { label: '予約単位料金', default: '', value: 'amount' },
        { label: 'ユーザーネーム', default: '', value: 'mainEntity.customer.username' },
        { label: '入場フラグ', default: '', value: 'attended' },
        { label: '入場日時', default: '', value: 'attendDate' },
    ];
    const opts = {
        fields: fields,
        // delimiter: ',',
        delimiter: '\t',
        eol: '\r\n',
        // flatten: true,
        // preserveNewLinesInValues: true,
        // unwind: 'acceptedOffers'
    };

    const parser = new json2csv.Parser(opts);
    var csv = parser.parse(datas);
    csv = encode2sjis(csv);
    // console.log('encoded.', csv);
    const blob = string2blob(csv, { type: 'text/csv' });
    const fileName = '売上レポート.tsv';
    download(blob, fileName);

    return false;
}

function encode2sjis(value) {
    // console.log('encoding...', value);
    var newValue = new Encoding.stringToCode(value)
    newValue = Encoding.convert(newValue, 'SJIS');

    return new Uint8Array(newValue);
}

/**
 * 文字列をBLOB変換
 */
function string2blob(value, options) {
    // const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    // return new Blob([bom, value], options);
    return new Blob([value], options);
}

function download(blob, fileName) {
    if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, fileName);
        window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    }
}


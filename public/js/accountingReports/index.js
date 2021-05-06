$(function () {
    var table = $("#accountingReports-table").DataTable({
        processing: true,
        serverSide: true,
        pagingType: 'simple',
        language: {
            info: 'Showing page _PAGE_',
            infoFiltered: ''
        },
        // paging: false,
        ajax: {
            url: '?' + $('form').serialize(),
            data: function (d) {
                d.limit = d.length;
                d.page = (d.start / d.length) + 1;
                // d.name = d.search.value;
                d.format = 'datatable';
            }
        },
        lengthChange: false,
        searching: false,
        order: [[1, 'asc']], // デフォルトは枝番号昇順
        ordering: false,
        columns: [
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.mainEntity.typeOf;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';
                    if (typeof data.mainEntity.object !== undefined
                        && data.mainEntity.object[0].paymentMethod !== undefined
                        && data.mainEntity.object[0].paymentMethod.totalPaymentDue !== undefined) {
                        html += data.mainEntity.object[0].paymentMethod.totalPaymentDue.value + '<br>' + data.mainEntity.object[0].paymentMethod.totalPaymentDue.currency;
                    }

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.mainEntity.object[0].paymentMethod.paymentMethodId;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.mainEntity.object[0].paymentMethod.typeOf;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = moment(data.mainEntity.startDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY-MM-DD HH:mm:ssZ');

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.itemTypeStr;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.isPartOf.mainEntity.orderNumber;

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = moment(data.isPartOf.mainEntity.orderDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY-MM-DD HH:mm:ssZ');

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';
                    if (typeof data.isPartOf.mainEntity.numItems === 'number') {
                        html += String(data.isPartOf.mainEntity.numItems);
                    }

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';
                    if (Array.isArray(data.eventStartDates)) {
                        html += data.eventStartDates.map((d) => {
                            return moment(d)
                                .tz('Asia/Tokyo')
                                .format('YYYY-MM-DD HH:mm:ssZ')
                        })
                            .join(',')

                    }

                    return html;

                }
            },
            // {
            //     data: null,
            //     render: function (data, type, row) {
            //         var html = data.isPartOf.customer.clientId;

            //         return html;
            //     }
            // },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';

                    if (Array.isArray(data.isPartOf.mainEntity.customer.identifier)) {
                        html += '<a href="javascript:void(0)" class="showCustomerIdentifier" data-orderNumber="' + data.isPartOf.mainEntity.orderNumber + '">表示</a>';
                    }

                    return html;
                }
            }
        ]
    });

    $(document).on('click', '.btn.search,a.search', function () {
        $('form.search').submit();
    });

    // $('.btn.search')
    //     .popover({
    //         title: '検索方法',
    //         content: 'ドロップダウンメニューから出力フォーマットを選択できます。ストリーミングダウンロードの場合、全件出力が可能です。',
    //         placement: 'top',
    //         trigger: 'hover'
    //     });

    // Date range picker
    $('#orderDateRange,#reservationForStartRange').daterangepicker({
        autoUpdateInput: false,
        timePicker: true,
        // timePickerIncrement: 30,
        locale: {
            format: 'YYYY-MM-DDTHH:mm:ssZ'
        }
    });
    $('#orderDateRange,#reservationForStartRange').on('apply.daterangepicker', function (ev, picker) {
        $(this).val(picker.startDate.format('YYYY-MM-DDTHH:mm:ssZ') + ' - ' + picker.endDate.format('YYYY-MM-DDTHH:mm:ssZ'));
    });
    $('#orderDateRange,#reservationForStartRange').on('cancel.daterangepicker', function (ev, picker) {
        $(this).val('');
    });

    $(document).on('click', '.downloadCSV', async function () {
        console.log('downloaing...');
        // this.utilService.loadStart({ process: 'load' });
        $(document).Toasts('create', {
            title: 'レポートダウンロードを開始します...',
            // body: 'Downloading reports...',
            autohide: true,
            delay: 2000,
            close: false
        });

        const reports = [];
        const limit = 100;
        let page = 0;
        while (true) {
            page += 1;
            console.log('searching reports...', limit, page);
            $(document).Toasts('create', {
                icon: 'fa fa-spinner',
                title: page + 'ページ目を検索しています...',
                // body: 'searching reports...page:' + page,
                autohide: true,
                delay: 2000,
                close: false
            });
            const searchResult = await new Promise((resolve, reject) => {
                // 全ページ検索する
                $.ajax({
                    url: '?' + $('form').serialize(),
                    type: 'GET',
                    dataType: 'json',
                    data: {
                        limit,
                        page,
                        format: 'datatable'
                    }
                }).done(function (result) {
                    console.log('searched.', result);
                    resolve(result);
                }).fail(function (xhr) {
                    reject();
                    // var res = $.parseJSON(xhr.responseText);
                    // alert(res.error.message);
                }).always(function () {
                    // this.utilService.loadEnd();
                });
            });

            if (Array.isArray(searchResult.data)) {
                reports.push(...searchResult.data);
            }

            if (searchResult.data.length < limit) {
                break;
            }
        }

        console.log(reports.length, 'reports found');
        $(document).Toasts('create', {
            title: reports.length + '件のレポートが見つかりました',
            // body: 'Downloading reports...',
            autohide: true,
            delay: 2000,
            close: false
        });

        const fields = [
            { label: 'アクションタイプ', default: '', value: 'mainEntity.typeOf' },
            { label: '金額', default: '', value: 'mainEntity.object.0.paymentMethod.totalPaymentDue.value' },
            { label: '通貨', default: '', value: 'mainEntity.object.0.paymentMethod.totalPaymentDue.currency' },
            { label: '決済方法ID', default: '', value: 'mainEntity.object.0.paymentMethod.paymentMethodId' },
            { label: '決済方法区分', default: '', value: 'mainEntity.object.0.paymentMethod.typeOf' },
            { label: '処理日時', default: '', value: 'mainEntity.startDate' },
            { label: 'アイテム', default: '', value: 'itemType' },
            { label: '注文番号', default: '', value: 'isPartOf.mainEntity.orderNumber' },
            { label: '注文日時', default: '', value: 'isPartOf.mainEntity.orderDate' },
            { label: 'アイテム数', default: '', value: 'isPartOf.mainEntity.numItems' },
            { label: '予約イベント日時', default: '', value: 'eventStartDates' },
            { label: 'アプリケーションクライアント', default: '', value: 'clientId' },
            { label: 'カスタマー識別子', default: '', value: 'isPartOf.mainEntity.customer.identifier' },
        ];
        const opts = {
            fields: fields,
            delimiter: ',',
            eol: '\n',
            // flatten: true,
            // preserveNewLinesInValues: true,
            // unwind: 'acceptedOffers'
        };

        const parser = new json2csv.Parser(opts);
        var csv = parser.parse(reports);
        const blob = string2blob(csv, { type: 'text/csv' });
        const fileName = 'accountingReports.csv';
        download(blob, fileName);

        return false;
    });

    $(document).on('click', '.downloadJson', function () {
        // ストリーミングの場合
        // var url = '/projects/' + PROJECT_ID + '/orders?' + $('form').serialize() + '&format=application/json';
        // window.open(url, '_blank');

        // レポート作成タスク追加
        var conditions = $('form.search').serializeArray();
        openCreateReportForm(conditions, 'application/json');

        return false;
    });

    $('#modal-createReport .submit').click(function () {
        createOrderReportTask();
    });

    $(document).on('click', '.showCustomerIdentifier', function () {
        showCustomerIdentifier($(this).data('ordernumber'));
    });

    /**
     * 注文のCustomer Identifierを表示する
     */
    function showCustomerIdentifier(orderNumber) {
        var reports = table
            .rows()
            .data()
            .toArray();
        var report = reports.find(function (report) {
            return report.isPartOf.mainEntity.orderNumber === orderNumber
        });
        var order = report.isPartOf.mainEntity;

        var modal = $('#modal-report');
        var title = 'Order `' + order.orderNumber + '` Customer Identifier';
        var body = '<textarea rows="25" class="form-control" placeholder="" disabled="">'
            + JSON.stringify(order.customer.identifier, null, '\t')
            + '</textarea>';
        modal.find('.modal-title').html(title);
        modal.find('.modal-body').html(body);
        modal.modal();
    }
});

function openCreateReportForm(conditions, format) {
    var orderDateRangeElement = conditions.find(function (e) {
        return e.name === 'orderDateRange';
    });
    var reservationForInSessionRangeElement = conditions.find(function (e) {
        return e.name === 'reservationForInSessionRange';
    });
    if ((orderDateRangeElement === undefined || typeof orderDateRangeElement.value !== 'string' || orderDateRangeElement.value.length === 0)
        && (reservationForInSessionRangeElement === undefined || typeof reservationForInSessionRangeElement.value !== 'string' || reservationForInSessionRangeElement.value.length === 0)) {
        alert('注文日時あるいは予約イベント開催期間を指定してください');

        return;
    }

    var orderDateRange = orderDateRangeElement.value;
    var reservationForInSessionRange = reservationForInSessionRangeElement.value;

    var message = '[注文日時]　' + orderDateRange
        + '<br>[予約イベント開始日時] ' + reservationForInSessionRange
        + '<br>の注文レポートを作成しようとしています。'
        + '<br>よろしいですか？';
    var modal = $('#modal-createReport');
    var title = message;
    modal.find('input[name=format]').val(format);
    modal.find('input[name=orderDateRange]').val(orderDateRange);
    modal.find('input[name=reservationForInSessionRange]').val(reservationForInSessionRange);
    modal.find('.modal-title').html(title);
    modal.modal();
}

function createOrderReportTask() {
    var data = {
        orderDateRange: $('#modal-createReport input[name=orderDateRange]').val(),
        reservationForInSessionRange: $('#modal-createReport input[name=reservationForInSessionRange]').val(),
        format: $('#modal-createReport input[name=format]').val(),
        reportName: $('#modal-createReport input[name=reportName]').val(),
        recipientEmail: $('#modal-createReport input[name=recipientEmail]').val()
    };

    $.ajax({
        url: '/projects/' + PROJECT_ID + '/orders/createOrderReport',
        type: 'POST',
        dataType: 'json',
        data: data
    }).done(function (result) {
        console.log(result);

        var modal = $('#modal-sm');
        var title = '注文レポート作成を開始しました';
        var body = [result].map(function (task) {
            var href = '/projects/' + PROJECT_ID + '/tasks/' + task.id + '?name=' + task.name;
            return task.id + ' <a target="_blank" href="' + href + '">タスクを確認</a>';
        }).join('<br>');
        ;
        modal.find('.modal-title').html(title);
        modal.find('.modal-body').html(body);
        modal.modal();
    }).fail(function (xhr) {
        var res = $.parseJSON(xhr.responseText);
        alert(res.error.message);
    }).always(function () {
    });
}
/**
 * 文字列をBLOB変換
 */
function string2blob(value, options) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    return new Blob([bom, value], options);
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
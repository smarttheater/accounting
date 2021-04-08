$(function () {
    var table = $("#paymentReports-table").DataTable({
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
                    var html = data.typeOf;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';
                    if (typeof data.object !== undefined
                        && data.object.paymentMethod !== undefined
                        && data.object.paymentMethod.totalPaymentDue !== undefined) {
                        html += data.object.paymentMethod.totalPaymentDue.value + '<br>' + data.object.paymentMethod.totalPaymentDue.currency;
                    }

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.object.paymentMethod.paymentMethodId;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = data.object.paymentMethod.typeOf;

                    return html;

                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = moment(data.startDate)
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
                    var html = data.order.orderNumber;

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = moment(data.order.orderDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY-MM-DD HH:mm:ssZ');

                    return html;
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';
                    if (typeof data.order.numItems === 'number') {
                        html += String(data.order.numItems);
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
            //         var html = data.order.customer.clientId;

            //         return html;
            //     }
            // },
            {
                data: null,
                render: function (data, type, row) {
                    var html = '';

                    if (Array.isArray(data.order.customer.identifier)) {
                        html += '<a href="javascript:void(0)" class="showCustomerIdentifier" data-orderNumber="' + data.order.orderNumber + '">表示</a>';
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

        const actions = [];
        const limit = 100;
        let page = 0;
        while (true) {
            page += 1;
            console.log('searching actions...', limit, page);
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
                actions.push(...searchResult.data);
            }

            if (searchResult.data.length < limit) {
                break;
            }
        }

        console.log(actions.length, 'actions found');
        $(document).Toasts('create', {
            title: actions.length + '件のレポートが見つかりました',
            // body: 'Downloading reports...',
            autohide: true,
            delay: 2000,
            close: false
        });

        const fields = [
            { label: 'アクションタイプ', default: '', value: 'typeOf' },
            { label: '金額', default: '', value: 'object.paymentMethod.totalPaymentDue.value' },
            { label: '通貨', default: '', value: 'object.paymentMethod.totalPaymentDue.currency' },
            { label: '決済方法ID', default: '', value: 'object.paymentMethod.paymentMethodId' },
            { label: '決済方法区分', default: '', value: 'object.paymentMethod.typeOf' },
            { label: '処理日時', default: '', value: 'startDate' },
            { label: 'アイテム', default: '', value: 'itemType' },
            { label: '注文番号', default: '', value: 'order.orderNumber' },
            { label: '注文日時', default: '', value: 'order.orderDate' },
            { label: 'アイテム数', default: '', value: 'order.numItems' },
            { label: '予約イベント日時', default: '', value: 'eventStartDates' },
            { label: 'クライアント', default: '', value: 'order.customer.clientId' },
            { label: 'カスタマー識別子', default: '', value: 'order.customer.identifier' },
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
        var csv = parser.parse(actions);
        const blob = string2blob(csv, { type: 'text/csv' });
        const fileName = 'paymentReports.csv';
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
        var actions = table
            .rows()
            .data()
            .toArray();
        var action = actions.find(function (action) {
            return action.order.orderNumber === orderNumber
        });
        var order = action.order;

        var modal = $('#modal-action');
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
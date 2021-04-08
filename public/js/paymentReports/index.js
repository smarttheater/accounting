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
                    var html = data.itemType;

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
    $('#orderDateRange,#reservationForInSessionRange').daterangepicker({
        autoUpdateInput: false,
        timePicker: true,
        // timePickerIncrement: 30,
        locale: {
            format: 'YYYY-MM-DDTHH:mm:ssZ'
        }
    })
    // $('#reservationForInSessionRange').daterangepicker({
    //     autoUpdateInput: false,
    //     timePicker: true,
    //     locale: {
    //         format: 'YYYY-MM-DDTHH:mm:ssZ'
    //     }
    // });
    $('#orderDateRange,#reservationForInSessionRange').on('apply.daterangepicker', function (ev, picker) {
        $(this).val(picker.startDate.format('YYYY-MM-DDTHH:mm:ssZ') + ' - ' + picker.endDate.format('YYYY-MM-DDTHH:mm:ssZ'));
    });
    $('#orderDateRange,#reservationForInSessionRange').on('cancel.daterangepicker', function (ev, picker) {
        $(this).val('');
    });

    $(document).on('click', '.downloadCSV', function () {
        // ストリーミングの場合
        // var url = '/projects/' + PROJECT_ID + '/orders?' + $('form').serialize() + '&format=text/csv';
        // window.open(url, '_blank');

        // レポート作成タスク追加
        var conditions = $('form.search').serializeArray();
        openCreateReportForm(conditions, 'text/csv');

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
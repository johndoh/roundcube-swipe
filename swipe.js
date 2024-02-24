/**
 * Swipe plugin script
 *
 * @licstart  The following is the entire license notice for the
 * JavaScript code in this file.
 *
 * Copyright (C) Philip Weir
 *
 * The JavaScript code in this page is free software: you can redistribute it
 * and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this file.
 */

rcube_webmail.prototype.swipe = {
    container_class: 'swipe-container',
    button_class: 'swipe-action',
    label_class: 'swipe-label',
    element: null,

    position_target: function (obj, pos, transition, max_move) {
        var translate = '';

        if (pos && transition) {
            if (transition == 'scale') {
                pos = pos > 0 ? pos : 0;
                translate = 'scale(' + pos / max_move + ')';
            }
            else {
                translate = transition + '(' + pos + 'px)';
            }
        }

        // Legacy Edge (Trident) does not support transform on <tr>s
        if (bw.edge && bw.vendver < 75 && $(obj).is('tr')) {
            $(obj).children('td').css('transform', translate);
        }
        else {
            $(obj).css('transform', translate);
        }
    },

    action_callback: function (command, props) {
        if (!props.uid)
        { return; }

        var prev_uid = rcmail.env[rcmail.env.swipe_selection_id];
        rcmail.env[rcmail.env.swipe_selection_id] = props.uid;

        var type = null;
        if (matches = command.match(/([a-z0-9_-]+)\/([a-z0-9-_]+)/)) {
            type = matches[1];
            command = matches[2];
        }

        if (type == 'mark') {
            rcmail.mark_message(command);
        }
        else if (type == 'compose') {
            rcmail.command(command, '', props.obj, props.originalEvent, true);
        }
        else if (type == 'select') {
            // Async action, do not override selection
            rcmail.env[rcmail.env.swipe_selection_id] = null;
            rcmail.env.swipe_list.select_row(props.uid, CONTROL_KEY, true);
        }
        else {
            var prev_command = rcmail.commands[command];
            rcmail.enable_command(command, true);

            // some actions require a button click in the UI to trigger things like popovers
            // rather than a direct command call
            $('#' + rcmail.buttons[command][0].id).trigger('click');

            // restore original state
            rcmail.enable_command(command, prev_command);
        }

        rcmail.env[rcmail.env.swipe_selection_id] = prev_uid;
    },

    select_action: function (direction, obj) {
        var actions = {
            archive: {
                class: rcmail.env.archive_folder ? 'archive swipe-move' : null,
                text: rcmail.env.archive_folder ? 'archive.buttontext' : null,
                command: rcmail.env.archive_folder ? 'plugin.archive' : null,
            },
            checkmail: {
                class: 'refresh swipe-checkmail',
                text: 'refresh',
                callback: function (p) { rcmail.command('checkmail'); },
            },
            compose: {
                class: 'compose swipe-compose',
                text: 'compose',
                command: 'compose',
            },
            delete: {
                class: 'delete swipe-danger',
                text: 'delete',
                command: 'delete',
            },
            forward: {
                class: 'forward swipe-compose',
                text: 'forward',
                command: 'compose/forward',
            },
            markasjunk: {
                class: !rcmail.env.markasjunk_spam_only && rcmail.env.mailbox == rcmail.env.markasjunk_spam_mailbox ? 'notjunk swipe-success' : 'junk swipe-danger',
                text: !rcmail.env.markasjunk_spam_only && rcmail.env.mailbox == rcmail.env.markasjunk_spam_mailbox ? 'markasjunk.markasnotjunk' : 'markasjunk.markasjunk',
                command: !rcmail.env.markasjunk_spam_only && rcmail.env.mailbox == rcmail.env.markasjunk_spam_mailbox ? 'plugin.markasjunk.not_junk' : 'plugin.markasjunk.junk',
            },
            move: {
                class: 'move swipe-move',
                text: 'moveto',
                command: 'move',
            },
            reply: {
                class: 'reply one swipe-compose',
                text: 'reply',
                command: 'compose/reply',
            },
            'reply-all': {
                class: 'reply all swipe-compose',
                text: 'replyall',
                command: 'compose/reply-all',
            },
            'swipe-read': {
                class: (obj && obj.hasClass('unread') ? 'read' : 'unread') + ' swipe-mark',
                text: obj && obj.hasClass('unread') ? 'swipe.markasread' : 'swipe.markasunread',
                command: obj && obj.hasClass('unread') ? 'mark/read' : 'mark/unread',
            },
            'swipe-flagged': {
                class: (obj && obj.hasClass('flagged') ? 'unflag' : 'flag') + ' swipe-mark',
                text: obj && obj.hasClass('flagged') ? 'swipe.markasunflagged' : 'swipe.markasflagged',
                command: obj && obj.hasClass('flagged') ? 'mark/unflagged' : 'mark/flagged',
            },
            'swipe-select': {
                class: (obj && obj.hasClass('selected') ? 'select invert' : 'selection') + ' swipe-select',
                text: obj && obj.hasClass('selected') ? 'swipe.deselect' : 'select',
                command: obj && obj.hasClass('selected') ? 'select/deselect' : 'select/select',
            },
            vcard_attachments: {
                class: 'vcard swipe-compose',
                text: 'vcard_attachments.forwardvcard',
                command: 'attach-vcard',
            },
            none: {
                class: null,
                text: null,
                callback: null,
                command: null,
            },
        };

        ret = rcmail.triggerEvent('swipe-action', { direction: direction, obj: obj });
        if (ret !== undefined) {
            // abort if one of the handlers returned false
            return ret === false ? actions.none : ret;
        }
        if (action = actions[rcmail.env.swipe_actions[direction]]) {
            if (!action.callback && action.command) {
                action.callback = function (p) { rcmail.swipe.action_callback(action.command, p); };
            }
        }
        else {
            // fall back to no action if nothing was found
            action = actions.none;
        }

        return action;
    },

    init: function (opts) {
        var swipeevents = {
            startevent: 'pointerdown',
            moveevent: 'pointermove',
            endevent: 'pointerup',
            cancelevent: 'pointercancel',
            minmove: 5,
            id: function (e) { return e.pointerId; },
            type: function (e) { return e.pointerType; },
            pos: function (e, x) { return e.originalEvent[x ? 'pageX' : 'pageY']; },
            clearswipe: function (e) {
                rcmail.swipe.position_target(opts[swipedata.axis].target_obj, 0);
                opts[swipedata.axis].target_obj.removeClass('swipe-active');

                // reset #swipe-action
                $('#swipe-action').removeClass().hide();
                $('.swipe-container').attr('class', rcmail.swipe.container_class);
                $('.swipe-action').attr('class', rcmail.swipe.button_class);
                rcmail.swipe.set_scroll_css();

                if (opts.parent_obj)
                { opts.parent_obj.off(swipeevents.moveevent, rcube_event.cancel); }

                // restore normal scrolling on touch devices
                if (swipedata.axis == 'vertical' && !bw.pointer) {
                    rcmail.swipe.parent.css('overflow-y', 'auto');
                }

                swipedata = {};
                rcmail.swipe.active = null;
            },
        };
        var swipedata = {};

        // fallback to touch events if there is no pointer support
        if (!bw.pointer) {
            swipeevents.startevent = 'touchstart';
            swipeevents.moveevent = 'touchmove';
            swipeevents.endevent = 'touchend';
            swipeevents.cancelevent = 'touchcancel';
            swipeevents.minmove = 15;
            swipeevents.id = function (e) { return e.changedTouches.length == 1 ? e.changedTouches[0].identifier : -1; };
            swipeevents.type = function (e) { return 'touch'; };
            swipeevents.pos = function (e, x) { return e.originalEvent.targetTouches[0][x ? 'pageX' : 'pageY']; };
        }

        // swipe on list container
        opts.source_obj
            .on(swipeevents.startevent, function (e) {
                if (!rcmail.swipe.active && swipeevents.type(e) == 'touch') {
                    swipedata.x = swipeevents.pos(e, true);
                    swipedata.y = swipeevents.pos(e, false);
                    swipedata.id = swipeevents.id(e);
                    swipedata.scrollable = rcmail.swipe.parent[0].offsetHeight < rcmail.swipe.parent[0].scrollHeight;
                    swipedata.scrolltop = rcmail.swipe.parent.scrollTop();

                    if (opts.parent_obj)
                    { opts.parent_obj.off(swipeevents.moveevent, rcube_event.cancel); }
                }
            })
            .on(swipeevents.moveevent, function (e) {
                // make sure no other swipes are active and no other pointers
                if (swipedata.id != swipeevents.id(e) || swipeevents.type(e) != 'touch')
                { return; }

                var changeX = swipeevents.pos(e, true) - swipedata.x;
                var changeY = swipeevents.pos(e, false) - swipedata.y;

                // stop the row from sliding off the screen completely
                changeY = opts.vertical ? Math.min(opts.vertical.maxmove, changeY) : 0;
                changeX = opts.horizontal ? (changeX < 0 ? Math.max(opts.horizontal.maxmove * -1, changeX) : Math.min(opts.horizontal.maxmove, changeX)) : 0;

                // use Math.abs() to ensure value is always a positive number
                var min_move = swipeevents.minmove; // the minimum amount of pointer movement required to trigger the swipe
                var temp_axis;
                if (opts.vertical && (Math.abs(changeY) > min_move || opts.vertical.target_obj.hasClass('swipe-active'))) {
                    temp_axis = 'vertical';
                }
                else if (opts.horizontal && (Math.abs(changeX) > min_move || opts.horizontal.target_obj.hasClass('swipe-active'))) {
                    temp_axis = 'horizontal';
                }
                else {
                    return;
                }

                // make sure no other swipes are active
                if (!temp_axis || !opts[temp_axis] || (rcmail.swipe.active && rcmail.swipe.active != temp_axis))
                { return; }

                // do not interfere with normal list scrolling
                if (temp_axis == 'vertical' && rcmail.swipe.parent.scrollTop() != 0) {
                    if (swipedata.scrollable)
                    { rcmail.swipe.set_scroll_css(); }

                    if (swipedata.axis)
                    { swipeevents.clearswipe(e); }

                    return;
                }
                if (temp_axis == 'horizontal' && !bw.pointer && swipedata.scrolltop != rcmail.swipe.parent.scrollTop()) {
                    return;
                }

                // save the axis info
                swipedata.axis = temp_axis;
                var direction = (swipedata.axis == 'vertical' ? 'down' : (changeX < 0 ? 'left' : 'right'));
                var action = rcmail.swipe.select_action(direction, opts.source_obj);

                // if there is no callback then abort
                if (!action.callback)
                { return; }

                $('#swipe-action').attr('class', temp_axis).data('callback', action.callback);
                $('.swipe-container').attr('class', rcmail.swipe.container_class + ' ' + direction);
                $('.swipe-action').attr('class', rcmail.swipe.button_class + ' ' + action.class);
                $('.swipe-label').text(rcmail.gettext(action.text));

                if (!opts[swipedata.axis].target_obj.hasClass('swipe-active')) {
                    var action_style = opts[swipedata.axis].action_sytle(opts[swipedata.axis].target_obj);
                    $('#swipe-action').css({
                        top: action_style.top,
                        left: action_style.left,
                        width: action_style.width,
                        height: action_style.height,
                    }).show();
                    opts[swipedata.axis].target_obj.addClass('swipe-active');
                    rcmail.swipe.active = swipedata.axis; // set the active swipe

                    if (opts.parent_obj)
                    { opts.parent_obj.on(swipeevents.moveevent, rcube_event.cancel); }

                    // prevent up scroll when vertical active on touch devices
                    if (rcmail.swipe.active == 'vertical' && !bw.pointer && changeY > 0)
                    { rcmail.swipe.parent.css('overflow-y', 'hidden'); }
                }

                // the user must swipe a certain about before the action is activated, try to prevent accidental actions
                // do not activate if there is no callback
                if (((swipedata.axis == 'vertical' && changeY > opts[swipedata.axis].minmove)
                    || (swipedata.axis == 'horizontal' && (changeX < (opts[swipedata.axis].minmove * -1) || changeX > opts[swipedata.axis].minmove))) && action.callback) {
                    $('#swipe-action.horizontal,#swipe-action.vertical > .swipe-container').addClass(action.class);
                }
                else {
                    // reset the swipe if the user takes the row back to the start
                    $('#swipe-action.horizontal,#swipe-action.vertical > .swipe-container').removeClass(action.class);
                    $('#swipe-action').data('callback', null);
                }

                var pos = swipedata.axis == 'vertical' ? changeY : changeX;
                rcmail.swipe.position_target(opts[swipedata.axis].target_obj, pos, opts[swipedata.axis].transition, opts[swipedata.axis].maxmove);
            })
            .on(swipeevents.endevent, function (e) {
                if (swipeevents.type(e) == 'touch' && swipedata.id == swipeevents.id(e) && rcmail.swipe.active
                    && rcmail.swipe.active == swipedata.axis && opts[swipedata.axis].target_obj.hasClass('swipe-active')) {
                    var callback = null;
                    if (callback = $('#swipe-action').data('callback'))
                    { callback({ uid: opts[swipedata.axis].uid, obj: opts[swipedata.axis].target_obj, originalEvent: e }); }

                    swipeevents.clearswipe(e);
                }
            })
            .on(swipeevents.cancelevent, function (e) {
                if (swipedata.axis)
                { swipeevents.clearswipe(e); }
            });
    },

    set_scroll_css: function () {
        // Edge (Trident) does not support pan-down, only pan-y
        if (bw.pointer && rcmail.swipe.parent.scrollTop() == 0 && !(bw.edge && bw.vendver < 75)) {
            // allow vertical pointer events to fire (if one is configured)
            var action = rcmail.swipe.select_action('down');
            rcmail.swipe.parent.css('touch-action', action.callback ? 'pan-down' : 'pan-y');
        }
        else {
            rcmail.swipe.parent.css('touch-action', 'pan-y');
        }
    },
};

$(document).ready(function () {
    if (window.rcmail && ((bw.touch && !bw.ie) || bw.pointer)) {
        rcmail.addEventListener('init', function () {
            rcmail.env.swipe_list = rcmail[rcmail.env.swipe_list_name];

            var list_container = $(rcmail.env.swipe_list.list).parent();
            if (rcmail.env.swipe_list.draggable || !list_container[0].addEventListener)
            { return; }

            var swipe_action = $('<div>').attr('id', 'swipe-action').append(rcmail.swipe.element);

            rcmail.swipe.parent = list_container;
            rcmail.swipe.parent.prepend(swipe_action.hide());

            rcmail.register_command('plugin.swipe.options', function () {
                var dialog = $('#swipeoptionsmenu').clone(true);
                $.each(rcmail.env.swipe_actions, function (direction, action) {
                    var option_input = $('.swipeoptions-' + direction, dialog).find('select,input');
                    if (option_input.is('input[type="radio"]')) {
                        option_input.filter('[value="' + action + '"]').prop('checked', true);
                    }
                    else if (option_input.is('select') && option_input.first().children('option').length > 0) {
                        option_input.val(action);
                    }
                    else {
                        $('.swipeoptions-' + direction, dialog).hide();
                    }
                });

                var save_func = function (e) {
                    var post = {};
                    $.each(['left', 'right', 'down'], function () {
                        var option_input = $('.swipeoptions-' + this, dialog).find('select,input').first();

                        if ($(option_input).is('input[type="radio"]')) {
                            selector = 'input[name="swipe_' + this + '"]:checked';
                        }
                        else if ($(option_input).is('select')) {
                            selector = 'select[name="swipe_' + this + '"]';
                        }

                        if ($(selector, dialog).val() != rcmail.env.swipe_actions[this]) {
                            rcmail.env.swipe_actions[this] = $(selector, dialog).val();
                            post['swipe_' + this] = rcmail.env.swipe_actions[this];
                        }
                    });

                    if (!$.isEmptyObject(post))
                    { rcmail.http_post('plugin.swipe.save_settings', post); }

                    return true;
                };

                rcmail.simple_dialog(dialog, rcmail.get_label('swipeoptions', 'swipe'), save_func);
            }, !rcmail.env.swipe_list.draggable);

            // down swipe on list container
            var swipe_config = {
                source_obj: rcmail.swipe.parent,
                parent_obj: null,
                vertical: {
                    minmove: $(window).height() * 0.19,
                    maxmove: $(window).height() * 0.2,
                    transition: 'scale',
                    action_sytle: function (o) {
                        return {
                            top: '',
                            left: 0,
                            width: rcmail.swipe.parent.width() + 'px',
                            height: '',
                        };
                    },
                    target_obj: $('#swipe-action'),
                    uid: null,
                },
            };

            rcmail.swipe.init(swipe_config);

            // prevent accidental list scroll when swipe active
            rcmail.swipe.parent.on('scroll', function () { rcmail.swipe.set_scroll_css(); }).trigger('scroll');

            rcmail.env.swipe_list.addEventListener('getselection', function (p) {
                if (rcmail.swipe.active && rcmail.env[rcmail.env.swipe_selection_id]) {
                    p.res = [rcmail.env[rcmail.env.swipe_selection_id]];
                    return false;
                }
            });
        });

        // right/left/down swipe on list
        rcmail.addEventListener('insertrow', function (props) {
            if (rcmail.env.swipe_list.draggable || !$('#' + props.row.id)[0].addEventListener)
            { return; }

            var row_width = $('#' + props.row.id).width();
            // if no row width is available then use window width as fall back
            row_width = row_width == 0 ? $(window).width() : row_width;

            var swipe_config = {
                source_obj: $('#' + props.row.id),
                parent_obj: rcmail.swipe.parent,
                horizontal: {
                    minmove: row_width * 0.25,
                    maxmove: row_width * 0.6,
                    transition: 'translatex',
                    action_sytle: function (o) {
                        return {
                            top: o.position().top + rcmail.swipe.parent.scrollTop(),
                            left: o.position().left,
                            width: o.width() + 'px',
                            height: (o.height() - 2) + 'px', // subtract the border
                        };
                    },
                    target_obj: $('#' + props.row.id),
                    uid: props.cid ? props.cid : props.uid,
                },
            };

            rcmail.swipe.init(swipe_config);
        });
    }
});

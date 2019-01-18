/**
 * Swipe plugin script
 *
 * @licstart  The following is the entire license notice for the
 * JavaScript code in this file.
 *
 * Copyright (C) 2018-2019 Philip Weir
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
    position_target: function(obj, pos, vertical, max_move) {
        var translate = '';

        if (pos)
            translate = (vertical ? 'scale(' + (pos > 0 ? pos : 0) / max_move + ')' : 'translatex(' + pos + 'px)');

        if (bw.edge && $(obj).is('tr')) { // Edge does not support transform on <tr>s
            $(obj).children('td').css('transform', translate);
        }
        else {
            $(obj).css('transform', translate);
        }
    },

    action_callback: function(command, type, props) {
        if (!props.uid)
            return;

        var prev_uid = rcmail.env.uid;
        rcmail.env.uid = props.uid;

        if (type == 'mark') {
            rcmail.mark_message(command);
        }
        else if (type == 'compose') {
            rcmail.enable_command(command, true);
            rcmail.command(command, '', props.obj, props.originalEvent);
        }
        else if (type == 'select') {
            rcmail.message_list.highlight_row(props.uid, true);

            var select_class = '';
            if (select_class = rcmail.env.swipe_listselection_class) {
                if (command == 'deselect' && rcmail.message_list.get_selection().length == 0)
                    $(rcmail.gui_objects.messagelist).removeClass(select_class);
                else
                    $(rcmail.gui_objects.messagelist).addClass(select_class);
            }
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

        rcmail.env.uid = prev_uid;
    },

    select_action: function(direction, obj) {
        var action = {
                'class': '',
                'text': '',
                'callback': null
            };

        ret = rcmail.triggerEvent('swipe-action', {'direction': direction, 'obj': obj});
        if (ret !== undefined) {
            // abort if one of the handlers returned false
            if (ret === false)
                return action;
            else
                return ret;
        }

        if (rcmail.env.swipe_actions[direction] == 'archive' && rcmail.env.archive_folder) {
            action.class = 'archive';
            action.text = 'archive.buttontext';
            action.callback = function(p) { rcmail.swipe.action_callback('plugin.archive', null, p); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'checkmail') {
            action.class = 'checkmail';
            action.text = 'refresh';
            action.callback = function(p) { rcmail.command('checkmail'); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'delete') {
            action.class = 'delete';
            action.text = 'delete';
            action.callback = function(p) { rcmail.swipe.action_callback('delete', null, p); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'forward') {
            action.class = 'forward';
            action.text = 'forward';
            action.callback = function(p) { rcmail.swipe.action_callback('forward', 'compose', p); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'markasjunk') {
            var spam_folder = rcmail.env.mailbox == rcmail.env.markasjunk_spam_mailbox;
            if (!rcmail.env.markasjunk_spam_only && spam_folder) {
                action.class = 'notjunk';
                action.text = 'markasjunk.markasnotjunk';
                action.callback = function(p) { rcmail.swipe.action_callback('plugin.markasjunk.not_junk', null, p); };
            }
            else {
                action.class = 'junk';
                action.text = 'markasjunk.markasjunk';
                action.callback = spam_folder ? null : function(p) { rcmail.swipe.action_callback('plugin.markasjunk.junk', null, p); };
            }
        }
        else if (rcmail.env.swipe_actions[direction] == 'move') {
            action.class = 'move';
            action.text = 'moveto';
            action.callback = function(p) { rcmail.swipe.action_callback('move', null, p); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'reply') {
            action.class = 'reply';
            action.text = 'reply';
            action.callback = function(p) { rcmail.swipe.action_callback('reply', 'compose', p); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'reply-all') {
            action.class = 'replyall';
            action.text = 'replyall';
            action.callback = function(p) { rcmail.swipe.action_callback('reply-all', 'compose', p); };
        }
        else if (rcmail.env.swipe_actions[direction] == 'swipe-read') {
            if (obj.hasClass('unread')) {
                action.class = 'read';
                action.text = 'swipe.markasread';
                action.callback = function(p) { rcmail.swipe.action_callback('read', 'mark', p); };
            }
            else {
                action.class = 'unread';
                action.text = 'swipe.markasunread';
                action.callback = function(p) { rcmail.swipe.action_callback('unread', 'mark', p); };
            }
        }
        else if (rcmail.env.swipe_actions[direction] == 'swipe-flagged') {
            if (obj.hasClass('flagged')) {
                action.class = 'unflagged';
                action.text = 'swipe.markasunflagged';
                action.callback = function(p) { rcmail.swipe.action_callback('unflagged', 'mark', p); };
            }
            else {
                action.class = 'flagged';
                action.text = 'swipe.markasflagged';
                action.callback = function(p) { rcmail.swipe.action_callback('flagged', 'mark', p); };
            }
        }
        else if (rcmail.env.swipe_actions[direction] == 'swipe-select') {
            if (obj.hasClass('selected')) {
                action.class = 'deselect';
                action.text = 'swipe.deselect';
                action.callback = function(p) { rcmail.swipe.action_callback('deselect', 'select', p); };
            }
            else {
                action.class = 'select';
                action.text = 'select';
                action.callback = function(p) { rcmail.swipe.action_callback('select', 'select', p); };
            }
        }

        return action;
    },

    init: function(opts) {
        var swipeevents = {
            'startevent': 'pointerdown',
            'moveevent': 'pointermove',
            'endevent': 'pointerup',
            'cancelevent': 'pointercancel',
            'id': function(e) { return e.pointerId; },
            'type': function(e) { return e.pointerType; },
            'pos': function(e, x) { return e.originalEvent[ x ? 'pageX' : 'pageY']; },
            'clearswipe': function(e) {
                rcmail.swipe.position_target(opts[swipedata.axis].target_obj, 0, swipedata.axis == 'vertical');
                $('#swipe-action').removeClass().hide();
                opts[swipedata.axis].target_obj.removeClass('swipe-active');
                swipedata = {};
                rcmail.swipe.active = null;

                if (opts.parent_obj)
                    opts.parent_obj.off(swipeevents.moveevent, rcube_event.cancel);
            }
        };
        var swipedata = {};

        // fallback to touch events if there is no pointer support
        if (!bw.pointer) {
            swipeevents.startevent = 'touchstart';
            swipeevents.moveevent = 'touchmove';
            swipeevents.endevent = 'touchend';
            swipeevents.cancelevent = 'touchcancel';
            swipeevents.id = function(e) { return e.changedTouches.length == 1 ? e.changedTouches[0].identifier : -1; };
            swipeevents.type = function(e) { return 'touch'; };
            swipeevents.pos = function(e, x) { return e.originalEvent.targetTouches[0][ x ? 'pageX' : 'pageY']; };
        }

        // swipe down on message list container
        opts.source_obj
            .on(swipeevents.startevent, function(e) {
                if (!rcmail.swipe.active && swipeevents.type(e) == 'touch') {
                    swipedata.x = swipeevents.pos(e, true);
                    swipedata.y = swipeevents.pos(e, false);
                    swipedata.id = swipeevents.id(e);
                    swipedata.scrollable = rcmail.swipe.parent[0].offsetHeight < rcmail.swipe.parent[0].scrollHeight;

                    if (opts.parent_obj)
                        opts.parent_obj.off(swipeevents.moveevent, rcube_event.cancel);
                }
            })
            .on(swipeevents.moveevent, function(e) {
                // make sure no other swipes are active and no other pointers
                if (swipedata.id != swipeevents.id(e) || swipeevents.type(e) != 'touch')
                    return;

                var changeX = swipeevents.pos(e, true) - swipedata.x;
                var changeY = swipeevents.pos(e, false) - swipedata.y;

                // stop the message row from sliding off the screen completely
                changeY = opts.vertical ? Math.min(opts.vertical.maxmove, changeY) : 0;
                changeX = opts.horizontal ? (changeX < 0 ? Math.max(opts.horizontal.maxmove * -1, changeX) : Math.min(opts.horizontal.maxmove, changeX)) : 0;

                var temp_axis;
                if (((changeY > 5 || changeY < -5) && changeX < 5 && changeX > -5) || (opts.vertical && opts.vertical.target_obj.hasClass('swipe-active'))) {
                    temp_axis = 'vertical';
                }
                else if (((changeX > 5 || changeX < -5) && changeY < 5 && changeY > -5) || (opts.horizontal && opts.horizontal.target_obj.hasClass('swipe-active'))) {
                    temp_axis = 'horizontal';
                }
                else {
                    return;
                }

                // make sure no other swipes are active
                if (!temp_axis || !opts[temp_axis] || (rcmail.swipe.active && rcmail.swipe.active != temp_axis))
                    return;

                // do not interfere with normal message list scrolling
                if (temp_axis == 'vertical' && rcmail.swipe.parent.scrollTop() != 0) {
                    if (bw.pointer && swipedata.scrollable)
                        rcmail.swipe.parent.css('touch-action', 'pan-y');

                    if (swipedata.axis)
                        swipeevents.clearswipe(e);

                    return;
                }

                // save the axis info
                swipedata.axis = temp_axis;
                var direction = (swipedata.axis == 'vertical' ? 'down' : (changeX < 0 ? 'left' : 'right'));
                var action = rcmail.swipe.select_action(direction, opts.source_obj);

                $('#swipe-action')
                    .addClass(temp_axis)
                    .data('callback', action.callback)
                        .children('div')
                            .removeClass()
                            .addClass(direction)
                            .children('span')
                                .removeClass()
                                .addClass(action.class)
                                .children('span')
                                    .text(rcmail.gettext(action.text));

                if (!opts[swipedata.axis].target_obj.hasClass('swipe-active')) {
                    var action_style = opts[swipedata.axis].action_sytle(opts[swipedata.axis].target_obj);
                    $('#swipe-action').css({
                        'top': action_style.top,
                        'left': action_style.left,
                        'width': action_style.width,
                        'height': action_style.height,
                        'transform': ''
                    }).show();
                    opts[swipedata.axis].target_obj.addClass('swipe-active');
                    rcmail.swipe.active = swipedata.axis; // set the active swipe

                    if (opts.parent_obj)
                        opts.parent_obj.on(swipeevents.moveevent, rcube_event.cancel);
                }

                // the user must swipe a certain about before the action is activated, try to prevent accidental actions
                // do not activate if there is no callback
                if (((swipedata.axis == 'vertical' && changeY > opts[swipedata.axis].minmove) ||
                    (swipedata.axis == 'horizontal' && (changeX < (opts[swipedata.axis].minmove * -1) || changeX > opts[swipedata.axis].minmove))) && action.callback) {
                    $('#swipe-action').addClass(action.class);
                }
                else {
                    // reset the swipe if the user takes the row back to the start
                    $('#swipe-action').removeClass(action.class);
                    $('#swipe-action').data('callback', null);
                }

                var vertical = swipedata.axis == 'vertical';
                rcmail.swipe.position_target(opts[swipedata.axis].target_obj, vertical ? changeY : changeX, vertical, opts[swipedata.axis].maxmove);
            })
            .on(swipeevents.endevent, function(e) {
                if (swipeevents.type(e) == 'touch' && swipedata.id == swipeevents.id(e) && rcmail.swipe.active &&
                    rcmail.swipe.active == swipedata.axis && opts[swipedata.axis].target_obj.hasClass('swipe-active')) {
                    var callback = null;
                    if (callback = $('#swipe-action').data('callback'))
                        callback({'uid': opts[swipedata.axis].uid, 'obj': opts[swipedata.axis].target_obj, 'originalEvent': e});

                    swipeevents.clearswipe(e);
                }
            })
            .on(swipeevents.cancelevent, function(e) {
                if (swipedata.axis)
                    swipeevents.clearswipe(e);
            });
    }
};

$(document).ready(function() {
    if (window.rcmail && ((bw.touch && !bw.ie) || bw.pointer)) {
        rcmail.addEventListener('init', function() {
            var messagelist_container = $(rcmail.gui_objects.messagelist).parent();
            if (rcmail.message_list.draggable || !messagelist_container[0].addEventListener)
                return;

            rcmail.swipe.parent = messagelist_container;
            rcmail.swipe.parent.prepend($('<div>').attr('id', 'swipe-action').html($('<div>').append($('<span>').append($('<span>')))).hide());

            // down swipe on message list container
            var swipe_config = {
                'source_obj': rcmail.swipe.parent,
                'parent_obj': null,
                'vertical': {
                    'minmove': $(window).height() * 0.19,
                    'maxmove': $(window).height() * 0.2,
                    'action_sytle': function(o) {
                        return {
                            'top': '',
                            'left': 0,
                            'width': rcmail.swipe.parent.width() + 'px',
                            'height': ''
                        };
                    },
                    'target_obj': $('#swipe-action'),
                    'uid': null
                }
            };

            rcmail.swipe.init(swipe_config);

            // prevent accidental message list scroll when swipe active
            rcmail.swipe.parent.on('scroll', function() {
                if (!bw.pointer) {
                    if (rcmail.swipe.active)
                        return false;
                }
                else if ($(this).scrollTop() == 0) {
                    // allow vertical pointer events to fire (if one is configured)
                    var action = rcmail.swipe.select_action('down');
                    // Edge does not support pan-down, only pan-y
                    rcmail.swipe.parent.css('touch-action', action.callback && ! bw.edge ? 'pan-down' : 'pan-y');
                }
            }).trigger('scroll');
        });

        // right/left/down swipe on message list
        rcmail.addEventListener('insertrow', function(props) {
            if (rcmail.message_list.draggable || !$('#' + props.row.id)[0].addEventListener)
                return;

            var row_width = $('#' + props.row.id).width();
            // if no row width is available then use window width as fall back
            row_width = row_width == 0 ? $(window).width() : row_width;

            var swipe_config = {
                'source_obj': $('#' + props.row.id),
                'parent_obj': rcmail.swipe.parent,
                'horizontal': {
                    'minmove': row_width * 0.25,
                    'maxmove': row_width * 0.6,
                    'action_sytle': function(o) {
                        return {
                            'top': o.position().top,
                            'left': o.position().left,
                            'width': o.width() + 'px',
                            'height': (o.height() - 2) + 'px' // subtract the border
                        };
                    },
                    'target_obj': $('#' + props.row.id),
                    'uid': props.uid
                }
            };

            rcmail.swipe.init(swipe_config);
        });

        // save swipe options
        rcmail.set_list_options_core = rcmail.set_list_options;
        rcmail.set_list_options = function(cols, sort_col, sort_order, threads, layout) {
            var post = {};
            $.each(['left', 'right', 'down'], function() {
                var option_input = $('.swipeoptions-' + this).find('select,input').first();

                if ($(option_input).is('input[type="radio"]')) {
                    selector = 'input[name="swipe_' + this + '"]:checked';
                }
                else if ($(option_input).is('select')) {
                    selector = 'select[name="swipe_' + this + '"]';
                    selector += $(selector).length > 1 ? ':visible' : '';
                }

                if ($(selector).val() != rcmail.env.swipe_actions[this]) {
                    rcmail.env.swipe_actions[this] = $(selector).val();
                    post['swipe_' + this] = rcmail.env.swipe_actions[this];
                }
            });

            if (!$.isEmptyObject(post))
                rcmail.http_post('plugin.swipe.save_settings', post);

            rcmail.set_list_options_core(cols, sort_col, sort_order, threads, layout);
        };
    }

    // add swipe options to list options menu
    rcmail.addEventListener('beforemenu-open', function(name) {
        if (name == rcmail.env.swipe_menuname) {
            var menu_obj = $('.swipe-menu');
            if (!rcmail.message_list.draggable && menu_obj.find('select,input').length > 0) {
                if (bw.edge)
                    menu_obj.find('.swipeoptions-down').hide();

                menu_obj.show();
            }
            else {
                menu_obj.hide();
            }
        }
    });

    // set the values swipe options menu
    rcmail.addEventListener('menu-open', function(p) {
        if (p.name == rcmail.env.swipe_menuname && $('.swipe-menu').is(':visible')) {
            // set form values
            $.each(['left', 'right', 'down'], function() {
                var option_input = $('.swipeoptions-' + this).find('select,input').first();

                if ($(option_input).is('input[type="radio"]')) {
                    selector = '#swipeoptions-' + this + '-' + rcmail.env.swipe_actions[this];
                    selector += $(selector).length > 1 ? ':visible' : '';
                    $(selector).prop('checked', true);
                }
                else if ($(option_input).is('select')) {
                    selector = 'select[name="swipe_' + this + '"]';
                    selector += $(selector).length > 1 ? ':visible' : '';
                    $(selector).val(rcmail.env.swipe_actions[this]);
                }
            });
        }
    });
});
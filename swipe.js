/**
 * Swipe plugin script
 *
 * @licstart  The following is the entire license notice for the
 * JavaScript code in this file.
 *
 * Copyright (C) 2018 Philip Weir
 *
 * The JavaScript code in this page is free software: you can redistribute it
 * and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this file.
 */

rcube_webmail.prototype.swipe_position_target = function(obj, pos, vertical) {
    var translate = '';

    if (pos)
        translate = (vertical ? 'translatey' : 'translatex') + '('+ pos +'px)';

    if (bw.edge && $(obj).is('tr')) // Edge does not support transform on <tr>s
        $(obj).children('td').css('transform', translate);
    else
        $(obj).css('transform', translate);
};

rcube_webmail.prototype.swipe_list_selection = function(uid, show, prev_sel) {
    // make the system think no preview pane exists while we do some fake message selects
    // to enable/disable relevant commands for current selection
    var prev_contentframe = rcmail.env.contentframe, i;
    this.env.contentframe = null;

    if (show) {
        if (this.message_list.selection.length == 0 || !this.message_list.in_selection(uid)) {
            prev_sel = prev_sel ? prev_sel : this.message_list.get_selection();
            this.message_list.clear_selection();
            this.message_list.highlight_row(uid, true);
        }
    }
    else if (prev_sel) {
        this.message_list.clear_selection();

        for (i in prev_sel)
            rcmail[this.list_object].highlight_row(prev_sel[i], true);
    }
    else {
        this.message_list.clear_selection();
    }

    this.env.contentframe = prev_contentframe;

    return prev_sel;
};

rcube_webmail.prototype.swipe_action_callback = function(command, type, props) {
    if (!props.uid)
        return;

    if (type == 'mark') {
        this.mark_message(command, props.uid);
    }
    else if (type == 'compose') {
        this.enable_command(command, true);
        this.env.uid = props.uid;
        this.command(command, '', props.obj, props.originalEvent);
    }
    else if (type == 'select') {
        this.message_list.highlight_row(props.uid, true);

        var select_class = '';
        if (select_class = $('#swipeoptions-menu').data('listselection-class')) {
            if (command == 'deselect' && this.message_list.get_selection().length == 0)
                $(this.gui_objects.messagelist).removeClass(select_class);
            else
                $(this.gui_objects.messagelist).addClass(select_class);
        }
    }
    else {
       var prev_sel = this.swipe_list_selection(props.uid, true);

        // enable command
        var prev_command = this.commands[command];
        this.enable_command(command, true);

        // some actions require a button click in the UI to trigger things like popovers
        // rather than a direct command call
        $('#' + this.buttons[command][0].id).trigger('click');

        if (props.delay_disable) {
            return {'prev_command': prev_command, 'prev_sel': prev_sel};
        }
        else {
            // restore original state
            this.enable_command(command, prev_command);
            this.swipe_list_selection(props.uid, false, prev_sel);
        }
    }
};

rcube_webmail.prototype.swipe_select_action = function(direction, obj) {
    var action = {
            'class': '',
            'text': '',
            'callback': null
        };

    ret = this.triggerEvent('swipe-action', {'direction': direction, 'obj': obj});
    if (ret !== undefined) {
        // abort if one of the handlers returned false
        if (ret === false)
            return action;
        else
            return ret;
    }

    if (this.env.swipe_actions[direction] == 'archive' && this.env.archive_folder) {
        action.class = 'archive';
        action.text = 'archive.buttontext';
        action.callback = function(p) { rcmail.swipe_action_callback('plugin.archive', null, p); };
    }
    else if (this.env.swipe_actions[direction] == 'checkmail') {
        action.class = 'checkmail';
        action.text = 'refresh';
        action.callback = function(p) { rcmail.command('checkmail'); };
    }
    else if (this.env.swipe_actions[direction] == 'delete') {
        action.class = 'delete';
        action.text = 'delete';
        action.callback = function(p) { rcmail.swipe_action_callback('delete', null, p); };
    }
    else if (this.env.swipe_actions[direction] == 'forward') {
        action.class = 'forward';
        action.text = 'forward';
        action.callback = function(p) { rcmail.swipe_action_callback('forward', 'compose', p); };
    }
    else if (this.env.swipe_actions[direction] == 'markasjunk') {
        action.class = 'junk';
        action.text = 'markasjunk.buttontitle';
        action.callback = function(p) { rcmail.swipe_action_callback('plugin.markasjunk', null, p); };
    }
    else if (this.env.swipe_actions[direction] == 'move') {
        action.class = 'move';
        action.text = 'moveto';
        action.callback = function(p) {
            p.delay_disable = true;

            var ret = rcmail.swipe_action_callback('move', null, p);

            // delay disabling the action until the next click
            rcmail.env.swipe_delayed_action = function(e) {
                if ($(e.target).parents('.folderlist').length == 0) {
                    rcmail.enable_command('move', ret.prev_command);
                    rcmail.swipe_list_selection(p.uid, false, ret.prev_sel);
                    rcmail.env.swipe_delayed_action = null;
                }
            };
        };
    }
    else if (this.env.swipe_actions[direction] == 'reply') {
        action.class = 'reply';
        action.text = 'reply';
        action.callback = function(p) { rcmail.swipe_action_callback('reply', 'compose', p); };
    }
    else if (this.env.swipe_actions[direction] == 'reply-all') {
        action.class = 'replyall';
        action.text = 'replyall';
        action.callback = function(p) { rcmail.swipe_action_callback('reply-all', 'compose', p); };
    }
    else if (this.env.swipe_actions[direction] == 'swipe-read') {
        if (obj.hasClass('unread')) {
            action.class = 'read';
            action.text = 'swipe.markasread';
            action.callback = function(p) { rcmail.swipe_action_callback('read', 'mark', p); };
        }
        else {
            action.class = 'unread';
            action.text = 'swipe.markasunread';
            action.callback = function(p) { rcmail.swipe_action_callback('unread', 'mark', p); };
        }
    }
    else if (this.env.swipe_actions[direction] == 'swipe-flagged') {
        if (obj.hasClass('flagged')) {
            action.class = 'unflagged';
            action.text = 'swipe.markasunflagged';
            action.callback = function(p) { rcmail.swipe_action_callback('unflagged', 'mark', p); };
        }
        else {
            action.class = 'flagged';
            action.text = 'swipe.markasflagged';
            action.callback = function(p) { rcmail.swipe_action_callback('flagged', 'mark', p); };
        }
    }
    else if (this.env.swipe_actions[direction] == 'swipe-select') {
        if (obj.hasClass('selected')) {
            action.class = 'deselect';
            action.text = 'swipe.deselect';
            action.callback = function(p) { rcmail.swipe_action_callback('deselect', 'select', p); };
        }
        else {
            action.class = 'select';
            action.text = 'select';
            action.callback = function(p) { rcmail.swipe_action_callback('select', 'select', p); };
        }
    }

    return action;
};

rcube_webmail.prototype.swipe_event = function(opts) {
    var swipeevents = {
        'startevent': 'pointerdown',
        'moveevent': 'pointermove',
        'endevent': 'pointerup',
        'cancelevent': 'pointercancel',
        'id': function(e) { return e.pointerId; },
        'type': function(e) { return e.pointerType; },
        'pos': function(e, x) { return e.originalEvent[ x ? 'pageX' : 'pageY']; },
        'clearswipe': function(e) {
            rcmail.swipe_position_target(opts[swipedata.axis].target_obj, 0, swipedata.axis == 'vertical');
            $('#swipe-action').removeClass().hide();
            opts[swipedata.axis].target_obj.removeClass('swipe-active');
            $(rcmail.gui_objects.messagelist).removeClass('swipe-block');
            swipedata = {};
            rcmail.env.swipe_active = null;

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
            if (!rcmail.env.swipe_active && swipeevents.type(e) == 'touch') {
                swipedata.x = swipeevents.pos(e, true);
                swipedata.y = swipeevents.pos(e, false);
                swipedata.id = swipeevents.id(e);
                swipedata.scrollable = rcmail.env.swipe_parent[0].offsetHeight < rcmail.env.swipe_parent[0].scrollHeight;

                if (opts.parent_obj)
                    opts.parent_obj.off(swipeevents.moveevent, rcube_event.cancel);

                // set display block to make table height work on android
                if ($.isEmptyObject(rcmail.message_list.rows))
                    $(rcmail.gui_objects.messagelist).addClass('swipe-block');
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
            if (!temp_axis || !opts[temp_axis] || (rcmail.env.swipe_active && rcmail.env.swipe_active != temp_axis))
                return;

            // do not interfere with normal message list scrolling
            if (temp_axis == 'vertical' && (changeY < 0 || opts.vertical.target_obj.parent().scrollTop() != 0)) {
                if (bw.pointer && swipedata.scrollable)
                    rcmail.env.swipe_parent.css('touch-action', 'pan-y');

                if (swipedata.axis)
                    swipeevents.clearswipe(e);

                return;
            }

            // save the axis info
            swipedata.axis = temp_axis;
            var direction = (swipedata.axis == 'vertical' ? 'down' : (changeX < 0 ? 'left' : 'right'));
            var action = rcmail.swipe_select_action(direction, opts.source_obj);

            // skip if there is no event
            if (!action.callback)
                return;

            $('#swipe-action')
                .data('callback', action.callback)
                    .children('div')
                        .removeClass()
                        .addClass(direction)
                        .children('span')
                            .removeClass()
                            .addClass(action.class)
                            .text(rcmail.gettext(action.text));

            if (!opts[swipedata.axis].target_obj.hasClass('swipe-active')) {
                var action_style = opts[swipedata.axis].action_sytle(opts[swipedata.axis].target_obj);
                $('#swipe-action').css({
                    'top': action_style.top,
                    'left': action_style.left,
                    'width': action_style.width,
                    'height': action_style.height
                }).show();
                opts[swipedata.axis].target_obj.addClass('swipe-active');
                rcmail.env.swipe_active = swipedata.axis; // set the active swipe

                if (opts.parent_obj)
                    opts.parent_obj.on(swipeevents.moveevent, rcube_event.cancel);
            }

            // the user must swipe a certain about before the action is activated, try to prevent accidental actions
            if ((swipedata.axis == 'vertical' && changeY > opts[swipedata.axis].minmove) ||
                (swipedata.axis == 'horizontal' && (changeX < (opts[swipedata.axis].minmove * -1) || changeX > opts[swipedata.axis].minmove))) {
                $('#swipe-action').addClass(action.class);
            }
            else {
                // reset the swipe if the user takes the row back to the start
                $('#swipe-action').removeClass();
                $('#swipe-action').data('callback', null);
            }

            rcmail.swipe_position_target(opts[swipedata.axis].target_obj, swipedata.axis == 'vertical' ? changeY : changeX, swipedata.axis == 'vertical');
        })
        .on(swipeevents.endevent, function(e) {
            if (swipeevents.type(e) == 'touch' && swipedata.id == swipeevents.id(e) && rcmail.env.swipe_active &&
                rcmail.env.swipe_active == swipedata.axis && opts[swipedata.axis].target_obj.hasClass('swipe-active')) {
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

$(document).ready(function() {
    if (window.rcmail && ((bw.touch && !bw.ie) || bw.pointer)) {
        rcmail.addEventListener('init', function() {
            var messagelist_container = $(rcmail.gui_objects.messagelist).parent();
            if (rcmail.message_list.draggable || !messagelist_container[0].addEventListener)
                return;

            rcmail.env.swipe_parent = messagelist_container;
            rcmail.env.swipe_parent.prepend($('<div>').attr('id', 'swipe-action').html($('<div>').append($('<span>'))).hide());

            // down swipe on message list container
            var swipe_config = {
                'source_obj': rcmail.env.swipe_parent,
                'parent_obj': null,
                'vertical': {
                    'minmove': $(window).height() * 0.1,
                    'maxmove': $(window).height() * 0.2,
                    'action_sytle': function(o) {
                        return {
                            'top': 0,
                            'left': 0,
                            'width': rcmail.env.swipe_parent.width() + 'px',
                            'height': $(window).height() * 0.2 + 'px'
                        };
                    },
                    'target_obj': $(rcmail.gui_objects.messagelist),
                    'uid': null
                }
            };

            rcmail.swipe_event(swipe_config);

            // prevent accidental message list scroll when swipe active
            rcmail.env.swipe_parent.on('scroll', function() {
                if (!bw.pointer) {
                    if (rcmail.env.swipe_active)
                        return false;
                }
                else if ($(this).scrollTop() == 0) {
                    // allow vertical pointer events to fire (if one is configured)
                    var action = rcmail.swipe_select_action('down');
                    // Edge does not support pan-down, only pan-y
                    rcmail.env.swipe_parent.css('touch-action', action.callback ? (bw.edge ? 'none' : 'pan-down') : 'pan-y');
                }
            }).trigger('scroll');
        });

        // right/left/down swipe on message list
        rcmail.addEventListener('insertrow', function(props) {
            if (rcmail.message_list.draggable || !$('#' + props.row.id)[0].addEventListener)
                return;

            var swipe_config = {
                'source_obj': $('#' + props.row.id),
                'parent_obj': rcmail.env.swipe_parent,
                'horizontal': {
                    'minmove': $('#' + props.row.id).width() * 0.25,
                    'maxmove': $('#' + props.row.id).width() * 0.6,
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
                },
                'vertical': {
                    'minmove': $(window).height() * 0.1,
                    'maxmove': $(window).height() * 0.2,
                    'action_sytle': function(o) {
                        return {
                            'top': o.children('tbody').position().top,
                            'left': o.children('tbody').position().left,
                            'width': o.children('tbody').width() + 'px',
                            'height': $(window).height() * 0.2 + 'px'
                        };
                    },
                    'target_obj': $(rcmail.gui_objects.messagelist),
                    'uid': null
                }
            };

            rcmail.swipe_event(swipe_config);
        });

        // disable delayed commands (eg move)
        $(document.body).on('click', function(e) {
            if (rcmail.env.swipe_delayed_action)
                rcmail.env.swipe_delayed_action(e);
        });

        // add swipe options to list options menu
        rcmail.addEventListener('menu-open', function(p) {
            if (p.name == $('#swipeoptions-menu').data('options-menuname')) {
                if (!rcmail.message_list.draggable) {
                    // set form values
                    $.each(['left', 'right', 'down'], function() {
                        $('select[name="swipe_' + this + '"]:visible').val(rcmail.env.swipe_actions[this]);
                    });

                    $('fieldset.swipe').show();
                }
                else {
                    $('fieldset.swipe').hide();
                }
            }
        });

        // save swipe options
        rcmail.set_list_options_core = rcmail.set_list_options;
        rcmail.set_list_options = function(cols, sort_col, sort_order, threads, layout)
        {
            var post = {};
            $.each(['left', 'right', 'down'], function() {
                if ($('select[name="swipe_' + this + '"]:visible').val() != rcmail.env.swipe_actions[this]) {
                    rcmail.env.swipe_actions[this] = $('select[name="swipe_' + this + '"]:visible').val();
                    post['swipe_' + this] = rcmail.env.swipe_actions[this];
                }
            });

            if (!$.isEmptyObject(post))
                rcmail.http_post('plugin.swipe.save_settings', post);

            rcmail.set_list_options_core(cols, sort_col, sort_order, threads, layout);
        }

        if ($('#swipeoptions-menu > fieldset').find('select').length > 0)
            $('#swipeoptions-menu > fieldset').appendTo('#' + $('#swipeoptions-menu').data('options-menuid'));
    }
});
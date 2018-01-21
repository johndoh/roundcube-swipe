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

    $(obj).css({
        '-webkit-transform': translate,
        '-ms-transform': translate,
        'transform': translate
    });
};

rcube_webmail.prototype.swipe_list_selection = function(uid, show, prev_sel) {
    // make the system think no preview pane exists while we do some fake message selects
    // to enable/disable relevant commands for current selection
    var prev_contentframe = rcmail.env.contentframe, i;
    rcmail.env.contentframe = null;

    if (show) {
        if (rcmail.message_list.selection.length == 0 || !rcmail.message_list.in_selection(uid)) {
            prev_sel = prev_sel ? prev_sel : rcmail.message_list.get_selection();
            rcmail.message_list.clear_selection();
            rcmail.message_list.highlight_row(uid, true);
        }
    }
    else if (prev_sel) {
        rcmail.message_list.clear_selection();

        for (i in prev_sel)
            rcmail[this.list_object].highlight_row(prev_sel[i], true);
    }
    else {
        rcmail.message_list.clear_selection();
    }

    rcmail.env.contentframe = prev_contentframe;

    return prev_sel;
};

rcube_webmail.prototype.swipe_select_action = function(direction, obj) {
    var action = {
            'class': '',
            'text': '',
            'callback': null
        };

    if (rcmail.env.swipe_actions[direction] == 'checkmail') {
        action.class = 'checkmail';
        action.text = 'refresh';
        action.callback = function(uid, obj, e) { rcmail.command('checkmail'); };
    }
    else if (rcmail.env.swipe_actions[direction] == 'delete') {
        action.class = 'delete';
        action.text = 'delete';
        action.callback = function(uid, obj, e) {
            if (!uid)
                return;

            var prev_sel = rcmail.swipe_list_selection(uid, true);

            // enable command
            var prev_command = rcmail.commands['delete'];
            rcmail.enable_command('delete', true);
            var result = rcmail.command('delete', '', obj, e);

            rcmail.enable_command('delete', prev_command);
            rcmail.swipe_list_selection(uid, false, prev_sel);
        };
    }
    else if (rcmail.env.swipe_actions[direction] == 'flagged') {
        if (obj.hasClass('flagged')) {
            action.class = 'unflagged';
            action.text = 'swipe.markasunflagged';
            action.callback = function(uid, obj, e) {
                if (!uid)
                    return;

                rcmail.mark_message('unflagged', uid);
            };
        }
        else {
            action.class = 'flagged';
            action.text = 'swipe.markasflagged';
            action.callback = function(uid, obj, e) {
                if (!uid)
                    return;

                rcmail.mark_message('flagged', uid);
            };
        }
    }
    else if (rcmail.env.swipe_actions[direction] == 'forward') {
        action.class = 'forward';
        action.text = 'forward';
        action.callback = function(uid, obj, e) {
            if (!uid)
                return;

            rcmail.enable_command('forward', true);
            rcmail.env.uid = uid;
            rcmail.command('forward', '', obj, e);
        };
    }
    else if (rcmail.env.swipe_actions[direction] == 'move') {
        action.class = 'move';
        action.text = 'moveto';
        action.callback = function(uid, obj, e) {
            if (!uid)
                return;

            rcmail.swipe_list_selection(uid, true);
            rcmail.enable_command('move', true);
            $('#' + rcmail.buttons['move'][0].id).trigger('click');
        };
    }
    else if (rcmail.env.swipe_actions[direction] == 'read') {
        if (obj.hasClass('unread')) {
            action.class = 'read';
            action.text = 'swipe.markasread';
            action.callback = function(uid, obj, e) {
                if (!uid)
                    return;

                rcmail.mark_message('read', uid);
            };
        }
        else {
            action.class = 'unread';
            action.text = 'swipe.markasunread';
            action.callback = function(uid, obj, e) {
                if (!uid)
                    return;

                rcmail.mark_message('unread', uid);
            };
        }
    }
    else if (rcmail.env.swipe_actions[direction] == 'reply') {
        action.class = 'reply';
        action.text = 'reply';
        action.callback = function(uid, obj, e) {
            if (!uid)
                return;

            rcmail.enable_command('reply', true);
            rcmail.env.uid = uid;
            rcmail.command('reply', '', obj, e);
        };
    }
    else if (rcmail.env.swipe_actions[direction] == 'replyall') {
        action.class = 'replyall';
        action.text = 'replyall';
        action.callback = function(uid, obj, e) {
            if (!uid)
                return;

            rcmail.enable_command('reply-all', true);
            rcmail.env.uid = uid;
            rcmail.command('reply-all', '', obj, e);
        };
    }
    else if (rcmail.env.swipe_actions[direction] == 'select') {
        if (obj.hasClass('selected')) {
            action.class = 'deselect';
            action.text = 'swipe.deselect';
            action.callback = function(uid, obj, e) {
                if (!uid)
                    return;

                rcmail.message_list.highlight_row(uid, true);

                if (rcmail.message_list.get_selection().length == 0)
                    $(rcmail.gui_objects.messagelist).removeClass('withselection');
            };
        }
        else {
            action.class = 'select';
            action.text = 'select';
            action.callback = function(uid, obj, e) {
                if (!uid)
                    return;

                $(rcmail.gui_objects.messagelist).addClass('withselection');
                rcmail.message_list.highlight_row(uid, true);
            };
        }
    }
    else if (rcmail.env.swipe_actions[direction] == 'archive' && rcmail.env.archive_folder) {
        action.class = 'archive';
        action.text = 'archive.buttontext';
        action.callback = function(uid, obj, e) {
            if (!uid)
                return;

            var prev_sel = rcmail.swipe_list_selection(uid, true);

            // enable command
            var prev_command = rcmail.commands['plugin.archive'];
            rcmail.enable_command('plugin.archive', true);
            var result = rcmail.command('plugin.archive', '', obj, e);

            rcmail.enable_command('plugin.archive', prev_command);
            rcmail.swipe_list_selection(uid, false, prev_sel);
        };
    }

    return action;
};

rcube_webmail.prototype.swipe_event = function(opts) {
    var touchstart = {};

    // swipe down on message list container
    opts.source_obj
        .on('touchstart', function(e) {
            touchstart.x = e.originalEvent.targetTouches[0].pageX;
            touchstart.y = e.originalEvent.targetTouches[0].pageY;
        })
        .on('touchmove', function(e) {
            // make sure no other swipes are active
            if (rcmail.env.swipe_active && rcmail.env.swipe_active != opts.axis)
                return;

            var changeX = e.originalEvent.targetTouches[0].pageX - touchstart.x;
            var changeY = e.originalEvent.targetTouches[0].pageY - touchstart.y;

            // stop the message row from sliding off the screen completely
            if (opts.axis == 'vertical') {
                changeY = Math.min(opts.maxmove, changeY);
            }
            else {
                changeX = changeX < 0 ? Math.max(opts.maxmove * -1, changeX) : Math.min(opts.maxmove, changeX);
            }

            if ((opts.axis == 'vertical' && (((changeX < 5 && changeX > -5) && opts.source_obj.scrollTop() == 0) || opts.target_obj.hasClass('swipe-active'))) ||
               ((opts.axis == 'horizontal' && ((changeY < 5 && changeY > -5) || opts.target_obj.hasClass('swipe-active'))))) {
                // do not allow swipe up
                if (opts.axis == 'vertical' && changeY < 0)
                    return

                var direction = (opts.axis == 'vertical' ? 'down' : (changeX < 0 ? 'left' : 'right'));
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

                if (!opts.target_obj.hasClass('swipe-active')) {
                    var action_style = opts.action_sytle(opts.target_obj);
                    $('#swipe-action').css({
                        'top': action_style.top,
                        'left': action_style.left,
                        'width': action_style.width,
                        'height': action_style.height
                    }).show();
                    opts.target_obj.addClass('swipe-active');
                    opts.source_obj.addClass('swipe-noscroll');
                    rcmail.env.swipe_active = opts.axis; // set the active swipe
                }

                // the user must swipe a certain about before the action is activated, try to prevent accidental actions
                if ((opts.axis == 'vertical' && changeY > opts.minmove) ||
                    (opts.axis == 'horizontal' && (changeX < (opts.minmove * -1) || changeX > opts.minmove))) {
                    $('#swipe-action').addClass(action.class);
                }
                else {
                    // reset the swipe if the user takes the row back to the start
                    $('#swipe-action').removeClass();
                    $('#swipe-action').data('callback', null);
                }

                rcmail.swipe_position_target(opts.target_obj, opts.axis == 'vertical' ? changeY : changeX, opts.axis == 'vertical');

                if (opts.parent_obj)
                    opts.parent_obj.on('touchmove', rcube_event.cancel);
            }
        })
        .on('touchend', function(e) {
            if (rcmail.env.swipe_active && rcmail.env.swipe_active == opts.axis && opts.target_obj.hasClass('swipe-active')) {
                rcmail.swipe_position_target(opts.target_obj, 0, opts.axis == 'vertical');

                var callback = null;
                if (callback = $('#swipe-action').data('callback'))
                    callback(opts.uid, opts.target_obj, e);

                $('#swipe-action').removeClass().hide();
                opts.target_obj.removeClass('swipe-active');
                opts.source_obj.removeClass('swipe-noscroll');
                rcmail.env.swipe_active = null;

                if (opts.parent_obj)
                    opts.parent_obj.off('touchmove', rcube_event.cancel);
            }
        });
}

$(document).ready(function() {
    if (window.rcmail && bw.touch && !((bw.ie || bw.edge) && bw.pointer)) {
        rcmail.addEventListener('init', function() {
            var messagelist_container = $(rcmail.gui_objects.messagelist).parent();
            if (rcmail.message_list.draggable || !messagelist_container[0].addEventListener)
                return;

            rcmail.env.swipe_parent = messagelist_container;
            rcmail.env.swipe_parent.prepend($('<div>').attr('id', 'swipe-action').html($('<div>').append($('<span>'))).hide());

            // down swipe on message list container
            var swipe_config = {
                'source_obj': rcmail.env.swipe_parent,
                'axis': 'vertical',
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
                'uid': null,
                'parent_obj': rcmail.env.swipe_parent.parent()
            };

            rcmail.swipe_event(swipe_config);
        });

        // right/left swipe on message list
        rcmail.addEventListener('insertrow', function(props) {
            if (rcmail.message_list.draggable || !$('#' + props.row.id)[0].addEventListener)
                return;

            var swipe_config = {
                'source_obj': $('#' + props.row.id),
                'axis': 'horizontal',
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
                'uid': props.uid,
                'parent_obj': rcmail.env.swipe_parent
            };

            rcmail.swipe_event(swipe_config);
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

        $('#swipeoptions-menu > fieldset').appendTo('#' + $('#swipeoptions-menu').data('options-menuid'));
    }
});
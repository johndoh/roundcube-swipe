<?php

/**
 * Swipe
 *
 * Plugin to add swipe actions to the message list on touch devices
 *
 * @author Philip Weir
 *
 * Copyright (C) 2018 Philip Weir
 *
 * This program is a Roundcube (https://roundcube.net) plugin.
 * For more information see README.md.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Roundcube. If not, see https://www.gnu.org/licenses/.
 */
class swipe extends rcube_plugin
{
    public $task = 'mail|addressbook';
    private $menu_file = null;
    private $config = array(
        'messagelist' => array('left' => 'none', 'right' => 'none', 'down' => 'none'),
        'contactlist' => array('left' => 'none', 'right' => 'none', 'down' => 'none')
    );
    private $actions = array(
        'messagelist' => array(
            'vertical' => array(
                'checkmail' => 'checkmail'
            ),
            'horizontal' => array(
                'archive' => 'archive.buttontext',
                'delete' => 'delete',
                'forward' => 'forward',
                'markasjunk' => 'markasjunk.markasjunk',
                'move' => 'moveto',
                'reply' => 'reply',
                'reply-all' => 'replyall',
                'swipe-flagged' => 'swipe.markasflagged',
                'swipe-read' => 'swipe.markasread',
                'swipe-select' => 'select'
            )
        ),
        'contactlist' => array(
            'vertical' => array(),
            'horizontal' => array(
                'attvcard' => 'vcard_attachments.forwardvcard',
                'compose' => 'compose',
                'delete' => 'delete',
                'swipe-select' => 'select'
            )
        )
    );
    private $rcube;
    private $list_type;

    public function init()
    {
        $this->rcube = rcube::get_instance();
        $this->list_type = $this->rcube->task == 'addressbook' ? 'contactlist' : 'messagelist';
        $this->add_texts('localization/');
        $this->register_action('plugin.swipe.save_settings', array($this, 'save_settings'));

        $this->_load_config();

        if ($this->rcube->output->type == 'html' && $this->rcube->action == '') {
            $this->menu_file = '/' . $this->local_skin_path() . '/includes/menu.html';
            $filepath = slashify($this->home) . $this->menu_file;
            if (is_file($filepath) && is_readable($filepath)) {
                $config = $this->config[$this->list_type];
                $this->rcube->output->set_env('swipe_actions', array(
                    'left' => $config['left'],
                    'right' => $config['right'],
                    'down' => $config['down']
                ));

                $this->include_stylesheet($this->local_skin_path() . '/swipe.css');
                $this->include_script('swipe.js');
                $this->rcube->output->add_label('swipe.swipeoptions', 'swipe.markasflagged', 'swipe.markasunflagged', 'swipe.markasread',
                    'swipe.markasunread', 'refresh', 'moveto', 'reply', 'replyall', 'forward', 'select', 'swipe.deselect', 'compose');
                $this->rcube->output->add_handler('swipeoptionslist', array($this, 'options_list'));

                $this->options_menu();
            }
        }
    }

    public function options_menu()
    {
        if ($this->_allowed_action('*')) {
            // add swipe actions link to the menu
            $this->add_button(array(
                    'command' => 'plugin.swipe.options',
                    'type' => 'link',
                    'class' => 'button swipe disabled',
                    'classact' => 'button swipe',
                    'title' => 'swipe.swipeoptions',
                    'innerclass' => 'inner',
                    'label' => 'swipe.swipeoptions'
                ), 'listcontrols');

            // add swipe actions popup menu
            $html = $this->rcube->output->just_parse("<roundcube:include file=\"$this->menu_file\" skinpath=\"plugins/swipe\" />");
            $this->rcube->output->add_footer($html);
        }
    }

    public function options_list($args)
    {
        $axis = $args['direction'] == 'down' ? 'vertical' : 'horizontal';
        $swipe_actions = $this->actions[$this->list_type][$axis];
        $args['id'] = 'swipeoptions-' . $args['direction'];
        $args['name'] = 'swipe_' . $args['direction'];

        // Allow other plugins to interact with the action list
        $data = rcube::get_instance()->plugins->exec_hook('swipe_actions_list', array('actions' => $swipe_actions, 'direction' => $args['direction']));

        $options = array();
        foreach ($data['actions'] as $action => $text) {
            if (!$this->_allowed_action($args['direction'], $action)) {
                continue;
            }

            $options[$action] = $this->gettext($text);
        }
        asort($options);

        // don't add none if there are no available actions, JS detects empty lists and hides the option
        if (count($options) > 0) {
            $options = array('none' => $this->gettext('none')) + $options;
        }

        $config = $this->config[$this->list_type];
        switch ($args['type']) {
            case 'radio':
                foreach ($options as $val => $text) {
                    $fieldid = $args['id'] . '-' . $val;
                    $radio = new html_radiobutton(array('name' => $args['name'], 'id' => $fieldid, 'class' => $val, 'value' => $val));
                    $radio = $radio->show($config[$args['direction']]);
                    $field = $radio . html::label($fieldid, $text);
                }

                break;
            case 'select':
                $select = new html_select($args);
                $select->add(array_values($options), array_keys($options));
                $field = $select->show($config[$args['direction']]);

                break;
        }

        return $field;
    }

    public function save_settings()
    {
        $save = false;
        foreach (array('left', 'right', 'down') as $direction) {
            if (($prop = rcube_utils::get_input_value('swipe_' . $direction, rcube_utils::INPUT_POST)) && $this->_allowed_action($direction)) {
                $this->config[$this->list_type][$direction] = $prop;
                $save = true;
            }
        }

        if ($save) {
            rcube::get_instance()->user->save_prefs(array('swipe_actions' => $this->config));
        }
    }

    private function _load_config()
    {
        $config = $this->rcube->config->get('swipe_actions', array());

        // remove disabled actions
        foreach ($config as $list => $opts) {
            foreach ($opts as $dirction => $action) {
                if ($this->_allowed_action($dirction, $action)) {
                    $this->config[$list][$dirction] = $action;
                }
            }
        }
    }

    private function _allowed_action($direction, $action = '')
    {
        $dont_override = (array) $this->rcube->config->get('dont_override');
        $disabled_actions = (array) $this->rcube->config->get('disabled_actions');
        $laoded_plugins = $this->api->loaded_plugins();
        $result = true;

        // Skip the action if it is in disabled_actions config option
        // Also skip actions from disabled/not configured plugins
        if (in_array('swipe_actions', $dont_override) || in_array('swipe_actions.' . $this->list_type, $dont_override) ||
            in_array('swipe_actions.' . $this->list_type . '.' . $direction, $dont_override)) {
            $result = false;
        }
        else if (in_array($action, $disabled_actions) || in_array($this->rcube->task . $action, $disabled_actions)) {
            $result = false;
        }
        else if ($action == 'archive' && !$this->rcube->output->env['archive_folder']) {
            // archive plugin
            $result = false;
        }
        else if ($action == 'markasjunk' && !in_array('markasjunk', $laoded_plugins)) {
            // markasjunk plugin
            $result = false;
        }
        else if ($action == 'attvcard' && !in_array('vcard_attachments', $laoded_plugins)) {
            // vcard_attachments plugin
            $result = false;
        }

        return $result;
    }
}

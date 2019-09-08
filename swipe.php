<?php

/**
 * Swipe
 *
 * Plugin to add swipe actions to the message list on touch devices
 *
 * @author Philip Weir
 *
 * Copyright (C) Philip Weir
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
    public $task = '^((?!login).)*$';
    private $menu_file = null;
    private $dont_override = array();
    private $disabled_actions = array();
    private $laoded_plugins = array();
    private $config = array();
    private $actions = array(
        'messagelist' => array(
            'list_name' => 'message_list',
            'selection_id' => 'uid',
            'vertical' => array(
                'checkmail' => array('label' => 'checkmail')
            ),
            'horizontal' => array(
                'archive' => array('label' => 'archive.buttontext', 'plugin' => true, 'condition' => 'config:archive_folder !== false'),
                'delete' => array('label' => 'delete'),
                'forward' => array('label' => 'forward'),
                'markasjunk' => array('label' => 'markasjunk.markasjunk', 'plugin' => true),
                'move' => array('label' => 'moveto'),
                'reply' => array('label' => 'reply'),
                'reply-all' => array('label' => 'replyall'),
                'swipe-flagged' => array('label' => 'swipe.markasflagged'),
                'swipe-read' => array('label' => 'swipe.markasread'),
                'swipe-select' => array('label' => 'select')
            )
        ),
        'contactlist' => array(
            'list_name' => 'contact_list',
            'selection_id' => 'cid',
            'vertical' => array(),
            'horizontal' => array(
                'vcard_attachments' => array('label' => 'vcard_attachments.forwardvcard', 'plugin' => true),
                'compose' => array('label' => 'compose'),
                'delete' => array('label' => 'delete'),
                'swipe-select' => array('label' => 'select')
            )
        ),
        'none' => null
    );
    private $rcube;
    private $list_type;

    public function init()
    {
        $this->rcube = rcube::get_instance();
        $this->add_texts('localization/');

        switch ($this->rcube->task) {
            case 'addressbook':
                $this->list_type = 'contactlist';
                break;
            case 'mail':
                $this->list_type = 'messagelist';
                break;
            default:
                $this->list_type = 'none';
        }

        $this->add_hook('ready', array($this, 'setup'));
        $this->register_action('plugin.swipe.save_settings', array($this, 'save_settings'));
    }

    public function setup()
    {
        if ($this->rcube->action != '') {
            return;
        }

        $this->_load_config();

        $this->menu_file = '/' . $this->local_skin_path() . '/includes/menu.html';
        $filepath = slashify($this->home) . $this->menu_file;
        if (is_file($filepath) && is_readable($filepath)) {
            // Allow other plugins to interact with the actions list
            $data = rcube::get_instance()->plugins->exec_hook('swipe_actions', array('list_type' => $this->list_type, 'actions' => $this->actions[$this->list_type]));
            $this->list_type = $data['list_type'];
            $this->actions[$this->list_type] = $data['actions'];

            if (empty($this->actions[$this->list_type])) {
                // no swipe actions found, disable the plugin
                return;
            }

            $config = $this->config[$this->list_type];
            $this->rcube->output->set_env('swipe_actions', array(
                'left' => $config['left'],
                'right' => $config['right'],
                'down' => $config['down']
            ));
            $this->rcube->output->set_env('swipe_list_name', $this->actions[$this->list_type]['list_name']);
            $this->rcube->output->set_env('swipe_selection_id',$this->actions[$this->list_type]['selection_id']);

            $this->include_stylesheet($this->local_skin_path() . '/swipe.css');
            $this->include_script('swipe.js');
            $this->rcube->output->add_label('swipe.swipeoptions', 'swipe.markasflagged', 'swipe.markasunflagged', 'swipe.markasread',
                'swipe.markasunread', 'refresh', 'moveto', 'reply', 'replyall', 'forward', 'select', 'swipe.deselect', 'compose');

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
                $this->rcube->output->add_handler('swipeoptionslist', array($this, 'options_list'));
                $html = $this->rcube->output->just_parse("<roundcube:include file=\"$this->menu_file\" skinpath=\"plugins/swipe\" />");
                $this->rcube->output->add_footer($html);
            }
        }
    }

    public function options_list($args)
    {
        $axis = $args['direction'] == 'down' ? 'vertical' : 'horizontal';
        $swipe_actions = $this->actions[$this->list_type][$axis];
        $args['id'] = 'swipeoptions-' . $args['direction'];
        $args['name'] = 'swipe_' . $args['direction'];

        $options = array();
        foreach ($swipe_actions as $action => $info) {
            if (!$this->_allowed_action($args['direction'], $action, $info)) {
                continue;
            }

            $options[$action] = $this->gettext($info['label']);
        }
        asort($options);

        // don't add none if there are no available actions, JS detects empty lists and hides the option
        if (!empty($options)) {
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
        $this->_load_config();

        // Allow other plugins to interact with the actions list
        $data = rcube::get_instance()->plugins->exec_hook('swipe_actions', array('list_type' => $this->list_type, 'actions' => $this->actions[$this->list_type]));
        $this->list_type = $data['list_type'];

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
        $this->dont_override = (array) $this->rcube->config->get('dont_override');
        $this->disabled_actions = (array) $this->rcube->config->get('disabled_actions');
        $this->laoded_plugins = $this->api->loaded_plugins();

        // initialize internal config
        foreach (array_keys($this->actions) as $list) {
            if ($list != 'none') {
                $this->config[$list] = array('left' => 'none', 'right' => 'none', 'down' => 'none');
            }
        }

        // get user config
        $config = $this->rcube->config->get('swipe_actions', array());

        // remove disabled actions
        foreach ($config as $list => $opts) {
            foreach ($opts as $direction => $action) {
                $axis = $direction == 'down' ? 'vertical' : 'horizontal';
                $opts = !empty($this->actions[$list][$axis][$action]) ? $this->actions[$list][$axis][$action] : null;

                if ($this->_allowed_action($direction, $action, $opts)) {
                    $this->config[$list][$direction] = $action;
                }
            }
        }
    }

    private function _allowed_action($direction, $action = '', $opts = null)
    {
        $result = true;

        // Skip the action if it is in disabled_actions config option
        // Also skip actions from disabled/not configured plugins
        if (in_array('swipe_actions', $this->dont_override) || in_array('swipe_actions.' . $this->list_type, $this->dont_override) ||
            in_array('swipe_actions.' . $this->list_type . '.' . $direction, $this->dont_override)) {
            $result = false;
        }
        else if (in_array($action, $this->disabled_actions) || in_array($this->rcube->task . $action, $this->disabled_actions)) {
            $result = false;
        }
        else if (isset($opts['plugin']) && !in_array($action, $this->laoded_plugins)) {
            // check plugin is enabled
            $result = false;
        }

        // check for special conditions
        if ($result && !empty($opts['condition']) && !$this->_eval_expression($opts['condition'])) {
            $result = false;
        }

        return $result;
    }

    private function _eval_expression($expression)
    {
        // from rcmail_output_html::eval_expression()
        $expression = preg_replace(
            array(
                '/session:([a-z0-9_]+)/i',
                '/config:([a-z0-9_]+)(:([a-z0-9_]+))?/i',
                '/env:([a-z0-9_]+)/i',
                '/request:([a-z0-9_]+)/i',
                '/cookie:([a-z0-9_]+)/i',
                '/browser:([a-z0-9_]+)/i',
            ),
            array(
                "\$_SESSION['\\1']",
                "\$this->rcube->config->get('\\1',rcube_utils::get_boolean('\\3'))",
                "\$this->rcube->output->env['\\1']",
                "rcube_utils::get_input_value('\\1', rcube_utils::INPUT_GPC)",
                "\$_COOKIE['\\1']",
                "\$this->rcmail->output->browser->{'\\1'}",
            ),
            $expression
        );

        return eval("return ($expression);");
    }
}

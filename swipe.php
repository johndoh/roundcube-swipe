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
    public $task = '?(?!login$|logout$|cli$).*';
    private $dont_override = [];
    private $disabled_actions = [];
    private $laoded_plugins = [];
    private $config = [];
    private $actions = [
        'messagelist' => [
            'list_name' => 'message_list',
            'selection_id' => 'uid',
            'vertical' => [
                'checkmail' => ['label' => 'checkmail'],
            ],
            'horizontal' => [
                'archive' => ['label' => 'archive.buttontext', 'plugin' => true, 'condition' => 'config:archive_mbox !== false'],
                'delete' => ['label' => 'delete'],
                'forward' => ['label' => 'forward'],
                'markasjunk' => ['label' => 'markasjunk.markasjunk', 'plugin' => true],
                'move' => ['label' => 'moveto'],
                'reply' => ['label' => 'reply'],
                'reply-all' => ['label' => 'replyall'],
                'swipe-flagged' => ['label' => 'swipe.markasflagged'],
                'swipe-read' => ['label' => 'swipe.markasread'],
                'swipe-select' => ['label' => 'select'],
            ],
        ],
        'contactlist' => [
            'list_name' => 'contact_list',
            'selection_id' => 'cid',
            'vertical' => [],
            'horizontal' => [
                'vcard_attachments' => ['label' => 'vcard_attachments.forwardvcard', 'plugin' => true],
                'compose' => ['label' => 'compose'],
                'delete' => ['label' => 'delete'],
                'swipe-select' => ['label' => 'select'],
            ],
        ],
        'none' => null,
    ];
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

        $this->add_hook('ready', [$this, 'setup']);
        $this->register_action('plugin.swipe.save_settings', [$this, 'save_settings']);
    }

    public function setup()
    {
        if ($this->rcube->action != '') {
            return;
        }

        $this->_load_config();

        // check if current skin is supported (if menu template exists)
        if ($file_info = $this->_get_include_file('menu.html')) {
            // Allow other plugins to interact with the actions list
            $data = rcube::get_instance()->plugins->exec_hook('swipe_actions', ['list_type' => $this->list_type, 'actions' => $this->actions[$this->list_type]]);
            $this->list_type = $data['list_type'];
            $this->actions[$this->list_type] = $data['actions'];

            if (empty($this->actions[$this->list_type])) {
                // no swipe actions found, disable the plugin
                return;
            }

            $config = $this->config[$this->list_type];
            $this->rcube->output->set_env('swipe_actions', [
                'left' => $config['left'],
                'right' => $config['right'],
                'down' => $config['down'],
            ]);
            $this->rcube->output->set_env('swipe_list_name', $this->actions[$this->list_type]['list_name']);
            $this->rcube->output->set_env('swipe_selection_id', $this->actions[$this->list_type]['selection_id']);

            $this->include_stylesheet($this->local_skin_path() . '/swipe.css');
            $this->include_script('swipe.js');
            $this->rcube->output->add_label('swipe.swipeoptions', 'swipe.markasflagged', 'swipe.markasunflagged', 'swipe.markasread',
                'swipe.markasunread', 'refresh', 'moveto', 'reply', 'replyall', 'forward', 'select', 'swipe.deselect', 'compose');

            if ($this->_allowed_action('*')) {
                // add swipe actions link to the menu
                $this->add_button([
                        'id' => 'plugin-swipe-options-btn',
                        'command' => 'plugin.swipe.options',
                        'type' => 'link',
                        'class' => 'button swipe disabled',
                        'classact' => 'button swipe',
                        'title' => 'swipe.swipeoptions',
                        'innerclass' => 'inner',
                        'label' => 'swipe.swipeoptions',
                    ], 'listcontrols');

                // add swipe actions popup menu
                $this->rcube->output->add_handler('swipeoptionslist', [$this, 'options_list']);

                // parse swipe options menu and add to output
                list($path, $include_path) = $file_info;
                $html = $this->rcube->output->just_parse("<roundcube:include file=\"/$path\" skinpath=\"$include_path\" />");
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

        $options = [];
        foreach ($swipe_actions as $action => $info) {
            if (!$this->_allowed_action($args['direction'], $action, $info)) {
                continue;
            }

            $options[$action] = $this->gettext($info['label']);
        }
        asort($options);

        // don't add none if there are no available actions, JS detects empty lists and hides the option
        if (!empty($options)) {
            $options = ['none' => $this->gettext('none')] + $options;
        }

        $config = $this->config[$this->list_type];
        switch ($args['type']) {
            case 'radio':
                foreach ($options as $val => $text) {
                    $fieldid = $args['id'] . '-' . $val;
                    $radio = new html_radiobutton(['name' => $args['name'], 'id' => $fieldid, 'class' => $val, 'value' => $val]);
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
        $data = rcube::get_instance()->plugins->exec_hook('swipe_actions', ['list_type' => $this->list_type, 'actions' => $this->actions[$this->list_type]]);
        $this->list_type = $data['list_type'];

        $save = false;
        foreach (['left', 'right', 'down'] as $direction) {
            if (($prop = rcube_utils::get_input_string('swipe_' . $direction, rcube_utils::INPUT_POST)) && $this->_allowed_action($direction)) {
                $this->config[$this->list_type][$direction] = $prop;
                $save = true;
            }
        }

        if ($save) {
            rcube::get_instance()->user->save_prefs(['swipe_actions' => $this->config]);
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
                $this->config[$list] = ['left' => 'none', 'right' => 'none', 'down' => 'none'];
            }
        }

        // get user config
        $config = $this->rcube->config->get('swipe_actions', []);

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
        elseif (in_array($action, $this->disabled_actions) || in_array($this->rcube->task . $action, $this->disabled_actions)) {
            $result = false;
        }
        elseif (isset($opts['plugin']) && !in_array($action, $this->laoded_plugins)) {
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
            [
                '/session:([a-z0-9_]+)/i',
                '/config:([a-z0-9_]+)(:([a-z0-9_]+))?/i',
                '/env:([a-z0-9_]+)/i',
                '/request:([a-z0-9_]+)/i',
                '/cookie:([a-z0-9_]+)/i',
                '/browser:([a-z0-9_]+)/i',
            ],
            [
                "\$_SESSION['\\1']",
                "\$this->rcube->config->get('\\1',rcube_utils::get_boolean('\\3'))",
                "\$this->rcube->output->env['\\1']",
                "rcube_utils::get_input_value('\\1', rcube_utils::INPUT_GPC)",
                "\$_COOKIE['\\1']",
                "\$this->rcmail->output->browser->{'\\1'}",
            ],
            $expression
        );

        return eval("return ($expression);");
    }

    private function _get_include_file($file)
    {
        $file_info = false;

        $base_path = slashify($this->home);
        $rel_path = $this->local_skin_path() . '/includes/' . $file;
        // path to skin folder relative to Roundcube root for template engine
        $template_include_path = 'plugins/' . $this->ID;

        // check if the skin dir is in the plugin folder or in the core skins
        // folder (external to this plugin) see RC #7445 for more info
        if (strpos($rel_path, 'plugins/') !== false) {
            $base_path = slashify(RCUBE_INSTALL_PATH);
            $template_include_path = '.';
        }

        if (is_file($base_path . $rel_path) && is_readable($base_path . $rel_path)) {
            $file_info = [$rel_path, $template_include_path];
        }

        return $file_info;
    }
}

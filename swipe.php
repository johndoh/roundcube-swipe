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
    public $task = 'mail';
    private $menu_file = null;
    private $config = array('left' => 'none', 'right' => 'none', 'down' => 'none');
    private $actions = array(
        'messagelist' => array(
            'vertical' => array(
                'checkmail' => 'checkmail'
            ),
            'horizontal' => array(
                'swipe-read' => 'swipe.markasread',
                'swipe-flagged' => 'swipe.markasflagged',
                'delete' => 'delete',
                'forward' => 'forward',
                'reply' => 'reply',
                'reply-all' => 'replyall',
                'move' => 'moveto',
                'swipe-select' => 'select',
                'archive' => 'archive.buttontext',
                'markasjunk' => 'markasjunk.markasjunk'
            )
        )
    );
    private $rcube;

    public function init()
    {
        $this->rcube = rcube::get_instance();
        $this->config = $this->_load_config();
        $this->register_action('plugin.swipe.save_settings', array($this, 'save_settings'));

        if ($this->rcube->output->type == 'html' && $this->rcube->action == '') {
            $this->menu_file = '/' . $this->local_skin_path() . '/includes/menu.html';
            $filepath = slashify($this->home) . $this->menu_file;
            if (is_file($filepath) && is_readable($filepath)) {
                $this->rcube->output->set_env('swipe_actions', array(
                    'left' => $this->config['left'],
                    'right' => $this->config['right'],
                    'down' => $this->config['down']
                ));

                $this->add_hook('render_page', array($this, 'options_menu'));
                $this->add_texts('localization/', true);
                $this->include_stylesheet($this->local_skin_path() . '/swipe.css');
                $this->include_script('swipe.js');
                $this->rcube->output->add_label('none', 'refresh', 'moveto', 'reply', 'replyall', 'forward', 'select');
                $this->rcube->output->add_handler('swipeoptionslist', array($this, 'options_list'));
                $this->rcube->output->add_handler('swipeenv', array($this, 'set_env'));
            }
        }
    }

    public function options_menu($args)
    {
        // Other plugins may use template parsing method, this causes more than one render_page execution.
        // We have to make sure the menu is added only once (when content is going to be written to client).
        if (!$args['write']) {
            return;
        }

        // add additional menus from skins folder
        $html = $this->rcube->output->just_parse("<roundcube:include file=\"$this->menu_file\" skinpath=\"plugins/swipe\" />");
        $this->rcube->output->add_footer($html);
    }

    public function options_list($args)
    {
        $disabled_actions = (array) rcube::get_instance()->config->get('disabled_actions');
        $laoded_plugins = $this->api->loaded_plugins();
        $swipe_actions = $this->actions[$args['source']][$args['axis']];
        $args['id'] = 'swipeoptions-' . $args['direction'];
        $args['name'] = 'swipe_' . $args['direction'];

        // Allow other plugins to interact with the action list
        $data = rcube::get_instance()->plugins->exec_hook('swipe_actions_list', array('actions' => $swipe_actions, 'source' => $args['source'], 'axis' => $args['axis']));

        $options = array();
        foreach ($data['actions'] as $action => $text) {
            // Skip the action if it is in disabled_actions config option
            // Also skip actions from disabled/not configured plugins
            if (in_array($action, $disabled_actions) || in_array('mail.' . $action, $disabled_actions) ||
                ($action == 'archive' && !$this->rcube->output->env['archive_folder']) ||
                ($action == 'markasjunk' && !in_array('markasjunk', $laoded_plugins))) {
                continue;
            }

            $options[$action] = $this->gettext($text);
        }
        asort($options);
        $options = array('none' => $this->gettext('none')) + $options;

        switch ($args['type']) {
            case 'radio':
                foreach ($options as $val => $text) {
                    $fieldid = $args['id'] . '-' . $val;
                    $radio = new html_radiobutton(array('name' => $args['name'], 'id' => $fieldid, 'class' => $val, 'value' => $val));
                    $radio = $radio->show($this->config[$args['direction']]);

                    if (isset($args['innertag'])) {
                        $text = html::tag($args['innertag'], null, $text);
                    }

                    if (isset($args['spacer'])) {
                        $text = $args['spacer'] . $text;
                    }

                    $radio = html::label($fieldid, $radio . $text);

                    if (isset($args['outertag'])) {
                        $radio = html::tag($args['outertag'], null, $radio);
                    }

                    $field .= $radio;
                }

                break;
            case 'select':
                $select = new html_select($args);
                $select->add(array_values($options), array_keys($options));
                $field = $select->show($this->config[$args['direction']]);

                break;
        }

        return $field;
    }

    public function set_env($args)
    {
        $this->rcube->output->set_env('swipe_' . $args['param'], $args['val']);
    }

    public function save_settings()
    {
        $config = array();
        foreach (array('left', 'right', 'down') as $direction) {
            if ($prop = rcube_utils::get_input_value('swipe_' . $direction, rcube_utils::INPUT_POST)) {
                $config[$direction] = $prop;
            }
        }

        if (count($config) > 0) {
            $config = array_merge($this->config, $config);
            $config = array('swipe_actions' => array('messagelist' => $config));
            rcube::get_instance()->user->save_prefs($config);
        }
    }

    private function _load_config()
    {
        $config = $this->rcube->config->get('swipe_actions', array());

        return array_key_exists('messagelist', $config) ? $config['messagelist'] : $this->config;
    }
}

<?php

/**
 * Swipe
 *
 * Pplugin to add swipe actions to the mesasge list on touch devices
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
    private $menu_file = '';
    private $config = array('left' => 'none', 'right' => 'none', 'down' => 'none');

    public function init()
    {
        $this->config = $this->_load_config();

        $this->menu_file = '/' . $this->local_skin_path() . '/menu.html';
        if (is_file(slashify($this->home) . $this->menu_file)) {
            if (rcube::get_instance()->output->type == 'html') {
                $this->api->output->set_env('swipe_actions', array(
                    'left' => $this->config['left'],
                    'right' => $this->config['right'],
                    'down' => $this->config['down']
                ));
                $this->add_texts('localization/', true);
                $this->api->output->add_label('none', 'refresh', 'moveto', 'reply', 'replyall', 'forward', 'select');
                $this->include_stylesheet($this->local_skin_path() . '/swipe.css');
                $this->include_script('swipe.js');
                $this->add_hook('render_page', array($this, 'options_menu'));
            }

            $this->register_action('plugin.swipe.save_settings', array($this, 'save_settings'));
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
        $html = $this->api->output->just_parse("<roundcube:include file=\"$this->menu_file\" skinpath=\"plugins/swipe\" />");
        $this->api->output->add_footer($html);
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
        $config = rcube::get_instance()->config->get('swipe_actions', array());
        return array_key_exists('messagelist', $config) ? $config['messagelist'] : $this->config;
    }
}

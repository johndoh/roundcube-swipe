Roundcube Webmail Swipe
=======================
This plugin adds left/right/down swipe actions to entries in the the message
list on touch devices (tables/phones).

ATTENTION
---------
This is just a snapshot from the GIT repository and is **NOT A STABLE version
of Swipe**. It is Intended for use with the **GIT-master** version of
Roundcube and it may not be compatible with older versions. Stable versions of
Swipe are available from the [Roundcube plugin repository][rcplugrepo]
(for 1.4 and above) or the [releases section][releases] of the GitHub
repository.

License
-------
This plugin is released under the [GNU General Public License Version 3+][gpl].

Even if skins might contain some programming work, they are not considered
as a linked part of the plugin and therefore skins DO NOT fall under the
provisions of the GPL license. See the README file located in the core skins
folder for details on the skin license.

Known issues
------------
* No support in IE
* No vertical swipe in Edge, no support for `touch-action: pan-down;` CSS - [bug report](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10573036/)

Install
-------
* Place this plugin folder into plugins directory of Roundcube
* Add swipe to $config['plugins'] in your Roundcube config

**NB:** When downloading the plugin from GitHub you will need to create a
directory called skin and place the files in there, ignoring the root
directory in the downloaded archive.

Supported skins
---------------
* Elastic

Configuration
-------------
To set the default actions add the following to your Roundcube config file:
```php
$config['swipe_actions'] = array(
    'messagelist' => array(
        'left' => '<action>',
        'right' => '<action>',
        'down' => '<action>'
    )
);
```
Replace `<action>` with your desired action from the list below.
Users can configure the actions, overriding the defaults, from the
List Options menu.

Supported actions
-----------------
The following actions are available for left/right swipe:

* `archive` - Archive the message (Requires the Roundcube Archive plugin)
* `delete` - Delete the message
* `forward` - Forward the message
* `markasjunk` - Mark the message as junk (Requires the Roundcube Markasjunk plugin)
* `move` - Move the message to a chosen folder
* `reply` - Reply to the message
* `reply-all` - Reply all to the message
* `swipe-flagged` - Mark the message as flagged/unflagged
* `swipe-read` - Mark the message as read/unread
* `swipe-select` - Select/deselect the message
* `none` - Swipe disabled

The following actions are available for down swipe:

* `checkmail` - Check for new messages in the current folder
* `none` - Swipe disabled

Interaction with other plugins
------------------------------
The `swipe_actions_list` hook is triggered when listing the available actions
on the list options menu.
*Arguments:*
 * actions
 * source
 * axis

*Return values:*
 * actions

The `swipe-action` JS event is triggered when a swipe action is performed.
Return `false` to abort the action or return a JSON object like this to assign
an action:
```js
{
  'class': '<class name for the action box>',
  'text': '<text displayed in the action box>',
  'callback': function(p) { <your action here> },
  'command': '<roundcube command>'
};
```
Note: Only 1 of callback and command need to be supplied. If no callback is
defined then the command is passed to the standard Swipe callback function.

[rcplugrepo]: https://plugins.roundcube.net/packages/johndoh/swipe
[releases]: https://github.com/johndoh/roundcube-swipe/releases
[gpl]: https://www.gnu.org/licenses/gpl.html
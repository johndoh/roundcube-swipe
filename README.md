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

Supported browsers
------------------
This plugin relies on [Pointer Events][pointer] with fallback support for
[Touch Events][touch] and should work in any browser which supports either of
these, such as: Chrome, Firefox, or Safari. When used with Edge there is no
support for vertical swipe actions, this is because the browser does not
support the `touch-action: pan-down;` CSS property - [bug report][edge].
There is no support for Internet Explorer.

Configuration
-------------
To set the default actions add the following to your Roundcube config file:
```php
$config['swipe_actions'] = array(
    'messagelist' => array(
        'left' => '<action>',
        'right' => '<action>',
        'down' => '<action>'
    ),
    'contactlist' => array(
        'left' => '<action>',
        'right' => '<action>',
        'down' => 'none'
    )
);
```
Replace `<action>` with your desired action from the list below.
Users can configure the actions, overriding the defaults, from the
List Options menu.

Supported actions
-----------------
*Mesasge List:*
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

*Contacts List:*
The following actions are available for left/right swipe:

* `vcard_attachments` - Attach the contact to a new message as a vCard (Requires the Roundcube Vcard_attachments plugin)
* `compose` - Compose a new message to this contact
* `delete` - Delete the contact
* `swipe-select` - Select/deselect the contact
* `none` - Swipe disabled

The following actions are available for down swipe:

* `none` - Swipe disabled

disabled_actions and dont_override
----------------------------------
This plugin respects the disabled_actions config option for Roundcube commands.
To prevent users from overriding swipe config you can add any of the following
to dont_override:
* `swipe_actions` - Prevent overriding all swipe config
* `swipe_actions.list` - e.g. `swipe_actions.mesasgelist` Prevent overriding of the swipe actions on a specific list, e.g. mesasgelist
* `swipe_actions.list.direction` - e.g. `swipe_actions.mesasgelist.left` Prevent overriding of the swipe actions on a specific list and direction

Interaction with other plugins
------------------------------
The `swipe_actions` hook is triggered when the plugin starts up
on the list options menu.
*Arguments:*
 * list_type - the name of list the swipe actions are being performed on, e.g. messagelist, used when selecting/saving config
 * actions - an array of actions for this list in the format:
```
$args['actions'] = array(
    'list_name' => '*JS list object name*',
    'selection_id' => '*JS element identifier e.g. UID*',
    'vertical' => array(
        '*action_name*' => array('label' => '*display name*'),
        ...
    ),
    'horizontal' => array(
        '*action_name*' => array('label' => '*display name*'),
        ...
    )
);
```

*Return values:*
 * list_type
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
[pointer]: https://caniuse.com/#feat=pointer
[touch]: https://caniuse.com/#feat=touch
[edge]: https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10573036/
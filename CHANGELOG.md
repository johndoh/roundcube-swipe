# Roundcube Webmail Swipe

## Unreleased

- Fix `archive` config var name (#25)
- Drop Legacy Edge support
- Drop touch event support

## Version 0.5 (2022-06-18, rc-1.5)

- Fix action box alignment after message list scroll (possibly related to rc 0389ffd)

## Version 0.4 (2021-05-08, rc-1.4.4)

- Support Dark Mode in Elastic
- Support for customizing Elastic skin
- Fix `swipe-select` action (#15)
- Make CSS class names consistent, use `swipe-*` rather than `swipe_*`

## Version 0.3.1 (2020-11-20, rc-1.4.4)

- Various code improvements

## Version 0.3 (2020-04-27, rc-1.4.4)

- Update command enabling after (req RC cb8c078)

## Version 0.2 (2020-01-03, rc-1.4.2)

- Better use of colours from core

## Version 0.1 (2019-10-27, rc-1.4)

- Add swipe support on contacts list
- Move swipe options to their own dialog
- Replace `swipeactions` with `swipeoptions`
- Use `listoptions` template container (req RC 03425d1)
- Allow menu to use select or radio buttons
- Add support for markasjunk plugin
- Support for pointer events
- Add hooks for other plugins to interact with
- Respect `dont_override` config
- Respect `disabled_actions` config
- Created plugin
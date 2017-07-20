/**
 * @file device.js: 处理与 swiper 所在设备有关的行为
 *
 * @note:
 * 这样做的好处：
 * 1. 为 swiper 提供透明的环境
 * 2. 模块解耦，方便单元测试
 *
 * @author zhangbobell
 *
 * @email：zhangbo21@baidu.com
 * @created: 2017.07.18
 */

 var Device = (function () {

    function Device(global) {
        this.hasTouch = !!(('ontouchstart' in global && !/Mac OS X /.test(global.navigator.userAgent))
            || (global.DocumentTouch && global.document instanceof global.DocumentTouch));
        this.startEvent = this.hasTouch ? 'touchstart' : 'mousedown';
        this.moveEvent = this.hasTouch ? 'touchmove' : 'mousemove';
        this.endEvent = this.hasTouch ? 'touchend' : 'mouseup';
        this.cancelEvent = this.hasTouch ? 'touchcancel' : 'mouseout';
        // orientationchange also trigger resize
        this.resizeEvent = 'resize';
    }

    Device.prototype.getDeviceEvent = function (event) {
        var position = this.hasTouch ? this.getTouchPosition(event) : this.getMousePosition(event);
        return {
            type: event.type,
            position: position,
            target: event.target,
            button: event.button,
            preventDefault: event.preventDefault.bind(event)
        };
    };

    Device.prototype.getTouchPosition = function (event) {
        if (event.targetTouches && event.targetTouches.length > 0) {
            return {
                X: event.targetTouches[0].pageX,
                Y: event.targetTouches[0].pageY,
            };
        }
        return {
            X: undefined,
            Y: undefined
        };
    };

    Device.prototype.getMousePosition = function (event) {
        if ('pageX' in event) {
            return {
                X: event.pageX,
                Y: event.pageY
            };
        }
        return {
            X: undefined,
            Y: undefined
        };
    };

    return Device;
 }());

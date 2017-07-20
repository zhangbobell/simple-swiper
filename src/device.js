(function (global) {
    var hasTouch = !!(('ontouchstart' in global && !/Mac OS X /.test(global.navigator.userAgent)) || global.DocumentTouch && document instanceof global.DocumentTouch);
    global.DEVICE = {
        hasTouch: hasTouch,
        startEvent: hasTouch ? 'touchstart' : 'mousedown',
        moveEvent: hasTouch ? 'touchmove' : 'mousemove',
        endEvent: hasTouch ? 'touchend' : 'mouseup',
        cancelEvent: hasTouch ? 'touchcancel' : 'mouseout',
        resizeEvent: 'onorientationchange' in global ? 'orientationchange' : 'resize',
        getDeviceEvent: getDeviceEvent
    };

    function getDeviceEvent(event) {
        var position = this.hasTouch ? _getTouchPosition(event) : _getMousePosition(event);
        
        return {
            type: event.type,
            position: position,
            target: event.target,
            button: event.button,
            preventDefault: event.preventDefault.bind(event)
        };
    }

    function _getTouchPosition(event) {
        if (event.targetTouches && event.targetTouches.length > 0) {
            return {
                X: event.targetTouches[0].pageX,
                Y: event.targetTouches[0].pageY,
            }
        }

        return {
            X: undefined,
            Y: undefined
        }
    }

    function _getMousePosition(event) {
        if ('pageX' in event) {
            return {
                X: event.pageX,
                Y: event.pageY
            }
        }

        return {
            X: undefined,
            Y: undefined
        }
    }
})(window);


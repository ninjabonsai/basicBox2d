(function () {
    'use strict';

    var b2Common = Box2D.Common,
        b2Math = Box2D.Common.Math,
        b2Collision = Box2D.Collision,
        b2Shapes = Box2D.Collision.Shapes,
        b2Dynamics = Box2D.Dynamics,
        b2Contacts = Box2D.Dynamics.Contacts,
        b2Controllers = Box2D.Dynamics.Controllers,
        b2Joints = Box2D.Dynamics.Joints;

    var isTouchDevice = 'ontouchstart' in document.documentElement;

    var w = window.innerWidth,
        h = window.innerHeight,
        SCALE = 200, // pixels per metre
        world,
        mouseJointsArray = [],
        boxCount = 20,
        debugOn = false;

    function init() {
        // box2d setup
        world = new b2Dynamics.b2World(new b2Math.b2Vec2(0, 10), true);
        createWallsAndFloor();

        if (isTouchDevice) {
            document.addEventListener('touchmove', function (e) {
                e.preventDefault()
            });
        }

        for (var i = 0; i < boxCount; i++) {

            // create dom element
            var div = document.createElement('div');

            var size = (Math.random() * 80 | 0) + 10;

            div.style.backgroundColor = 'rgb(' + (Math.random() * 255 | 0) + ', ' + (Math.random() * 255 | 0) + ', 0)';
            div.style.position = 'absolute';
            div.style.width = size + 'px';
            div.style.height = size + 'px';
            div.style.marginTop = -size / 2 + 'px';
            div.style.marginLeft = -size / 2 + 'px';
            document.body.appendChild(div);

            div.addEventListener(isTouchDevice ? 'touchstart' : 'mousedown', function (e) {
                e.preventDefault();

                var xPos,
                    yPos;

                if (!isTouchDevice) {
                    xPos = e.pageX;
                    yPos = e.pageY;
                    addJoint(this, xPos, yPos);
                } else {
                    xPos = e.changedTouches[0].pageX;
                    yPos = e.changedTouches[0].pageY;
                    addJoint(this, xPos, yPos, e.changedTouches[0]);
                }

                var mouseUpEvent = function (e) {
                    e.preventDefault();

                    destroyJoint(e);

                    window.removeEventListener('mousemove', moveJoints);
                    window.removeEventListener('mouseup', mouseUpEvent);
                }

                if (!isTouchDevice) {
                    window.addEventListener('mousemove', moveJoints);
                    window.addEventListener('mouseup', mouseUpEvent);
                }
            });

            // create b2Body
            var boxBody = createBox(size);
            boxBody.SetUserData(div);

            // div needs a reference to body for adding mouse joint
            div.body = boxBody;
        }

        if (isTouchDevice) {
            window.addEventListener('touchmove', moveJoints);
            window.addEventListener('touchend', function (e) {
                e.preventDefault();

                destroyJoint(e);
            });
        }

        // add debug canvas if necessary
        if (debugOn) {
            addDebugCanvas();
        }

        // start rendering
        tick();
    }

    function createWallsAndFloor() {
        // create walls and floor
        var fixDef = new b2Dynamics.b2FixtureDef();
        fixDef.density = 1;
        fixDef.friction = .5;

        var bodyDef = new b2Dynamics.b2BodyDef();
        bodyDef.type = b2Dynamics.b2Body.b2_staticBody;

        // FLOOR
        var floorShape = new b2Shapes.b2PolygonShape();
        floorShape.SetAsBox(w / 2 / SCALE, 10 / SCALE);

        fixDef.shape = floorShape;

        bodyDef.position.x = w / 2 / SCALE;
        bodyDef.position.y = (h + 10) / SCALE;

        var floor = world.CreateBody(bodyDef);
        floor.CreateFixture(fixDef);

        // WALLS
        var wallShape = new b2Shapes.b2PolygonShape();
        wallShape.SetAsBox(10 / SCALE, h / 2 / SCALE);

        // left wall
        fixDef.shape = wallShape;

        bodyDef.position.x = -10 / SCALE;
        bodyDef.position.y = h / 2 / SCALE;

        var leftWall = world.CreateBody(bodyDef);
        leftWall.CreateFixture(fixDef);

        // right wall
        bodyDef.position.x = (w + 10) / SCALE;

        var rightWall = world.CreateBody(bodyDef);
        rightWall.CreateFixture(fixDef);
    }

    function createBox(size) {
        var bodyDef = new b2Dynamics.b2BodyDef();
        bodyDef.type = b2Dynamics.b2Body.b2_dynamicBody;
        bodyDef.position.x = Math.random() * w / SCALE;
        bodyDef.position.y = Math.random() * -h / SCALE;

        var shape = new b2Shapes.b2PolygonShape();
        shape.SetAsBox(size / 2 / SCALE, size / 2 / SCALE);

        var fixDef = new b2Dynamics.b2FixtureDef();
        fixDef.density = 1;
        fixDef.friction = .5;
        fixDef.restitution = .25;
        fixDef.shape = shape;

        var boxBody = world.CreateBody(bodyDef);
        boxBody.CreateFixture(fixDef);

        boxBody.SetAngularVelocity(Math.random() * 10 - 5);

        return boxBody;
    }

    function addDebugCanvas() {
        var debugCanvas = document.createElement('canvas');
        debugCanvas.className = 'debug-canvas';
        debugCanvas.width = w;
        debugCanvas.height = h;
        document.body.appendChild(debugCanvas);

        var debugDraw = new b2Dynamics.b2DebugDraw();
        debugDraw.SetSprite(debugCanvas.getContext('2d'));
        debugDraw.SetFillAlpha(.35);
        debugDraw.SetDrawScale(SCALE);
        debugDraw.SetFlags(b2Dynamics.b2DebugDraw.e_shapeBit | b2Dynamics.b2DebugDraw.e_jointBit);

        world.SetDebugDraw(debugDraw);
    }

    function addJoint(div, xPos, yPos, currentTouch) {
        var body = div.body;

        if (body) {
            var mjd = new b2Joints.b2MouseJointDef();
            mjd.bodyA = world.GetGroundBody();
            mjd.bodyB = body;
            mjd.target = new b2Math.b2Vec2(xPos / SCALE, yPos / SCALE);
            mjd.maxForce = 10000;

            var mj = world.CreateJoint(mjd);

            if (!isTouchDevice) {
                mouseJointsArray[0] = mj;
            } else {
                mouseJointsArray.push(mj);
            }

            mj.currentTouch = currentTouch;
        }
    }

    function moveJoints(e) {
        var xPos,
            yPos,
            mjl = mouseJointsArray.length;

        for (var i = 0; i < mjl; i++) {
            var mj = mouseJointsArray[i];

            if (!isTouchDevice) {
                xPos = e.pageX;
                yPos = e.pageY;
            } else {
                xPos = mj.currentTouch.pageX;
                yPos = mj.currentTouch.pageY;
            }

            mj.SetTarget(new b2Math.b2Vec2(xPos / SCALE, yPos / SCALE));
        }
    }

    function destroyJoint(e) {
        if (!isTouchDevice) {
            if (mouseJointsArray[0]) {
                world.DestroyJoint(mouseJointsArray[0]);
            }
        } else {
            for (var i = 0; i < mouseJointsArray.length; i++) {
                var mj = mouseJointsArray[i];

                if (mj.currentTouch === e.changedTouches[0]) {
                    mj.currentTouch = undefined;
                    world.DestroyJoint(mj);
                    mouseJointsArray.splice(i--, 1);
                }
            }
        }
    }

    window.requestAnimFrame = (function () {
        return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    function tick() {
        world.Step(1 / 60, 8, 2);
        world.ClearForces();

        var div;

        for (var body = world.GetBodyList(); body; body = body.GetNext()) {
            if (body.GetType() == b2Dynamics.b2Body.b2_dynamicBody) {
                div = body.GetUserData();

                // set position
                div.style.left = body.GetPosition().x * SCALE + 'px';
                div.style.top = body.GetPosition().y * SCALE + 'px';

                // set rotation
                div.style.webkitTransform =
                    div.style.mozTransform =
                        div.style.oTransform =
                            div.style.msTransform =
                                div.style.transform =
                                    'rotate(' + body.GetAngle() + 'rad)';
            }
        }

        // draw debug data if using debug canvas
        if (debugOn) {
            world.DrawDebugData();
        }

        requestAnimFrame(tick);
    }

    init();
}());
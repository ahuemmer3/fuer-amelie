import * as THREE from 'three';

/**
 * The two of you as little animated characters for the cockpit (big heads, small bodies).
 * Looks taken from your photos: Aaron with short dark hair in black,
 * Amelie with longer light-brown hair, round glasses, a shell necklace and white clothes.
 * Facing +Z. update() makes them blink, look around, look into the camera and wave.
 */
const SKIN = '#f3c9ae';

function mat(color, rough = .6, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }); }

function eye(irisColor) {
  const g = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(.034, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  white.scale.set(1, 1.15, .55);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(.024, 16, 12), new THREE.MeshBasicMaterial({ color: irisColor }));
  iris.scale.set(1, 1.1, .5); iris.position.z = .013;
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(.013, 12, 8), new THREE.MeshBasicMaterial({ color: '#1a1216' }));
  pupil.scale.set(1, 1.1, .5); pupil.position.z = .021;
  const shine = new THREE.Mesh(new THREE.SphereGeometry(.0065, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  shine.position.set(.008, .01, .027);
  g.add(white, iris, pupil, shine);
  g.userData.look = [iris, pupil, shine];
  return g;
}

/** a smile: part of a thin torus */
function smile(color = '#b2425e', width = .05) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(width, .009, 8, 24, Math.PI * .8), new THREE.MeshBasicMaterial({ color }));
  m.rotation.z = Math.PI + Math.PI * .1;
  return m;
}

export function createPilot(who) {
  const isAmelie = who === 'amelie';
  const root = new THREE.Group();
  const skin = mat(SKIN, .55);
  const suit = isAmelie ? mat('#f6f1f3', .5) : mat('#1f1c24', .55);
  const trim = mat('#ff4fa3', .4, { emissive: '#ff2f8e', emissiveIntensity: .35 });
  const hairCol = isAmelie ? '#8a6240' : '#24170f';
  const hair = mat(hairCol, .5, { metalness: .05 });

  // body: chibi torso, shoulders, arms
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .16, 6, 16), suit);
  torso.scale.set(1.2, 1, .85); torso.position.y = -.31;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.075, .014, 8, 24), trim);
  collar.rotation.x = Math.PI / 2; collar.position.y = -.19;
  root.add(torso, collar);
  const heartPatch = new THREE.Mesh(new THREE.CircleGeometry(.022, 16), trim);
  heartPatch.position.set(.06, -.27, .104);
  root.add(heartPatch);
  const arm = side => {
    const a = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.038, .12, 4, 10), suit);
    up.position.y = -.08;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.036, 12, 10), skin);
    hand.position.y = -.17;
    a.add(up, hand);
    a.position.set(side * .15, -.22, 0);
    a.rotation.x = -.9; a.rotation.z = side * .25;
    root.add(a);
    return a;
  };
  const armL = arm(1), armR = arm(-1);

  // head (pivot at the neck)
  const head = new THREE.Group();
  head.position.y = -.17;
  root.add(head);
  const face = new THREE.Group();
  face.position.y = .17;
  head.add(face);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 24), skin);
  skull.scale.set(1, 1.04, .98);
  face.add(skull);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), skin);
  nose.position.set(0, -.012, .166);
  face.add(nose);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), skin);
    ear.scale.set(.5, 1, .7); ear.position.set(s * .168, -.01, 0);
    face.add(ear);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(.026, 16), new THREE.MeshBasicMaterial({ color: '#ff8fb0', transparent: true, opacity: .45, depthWrite: false }));
    blush.position.set(s * .09, -.045, .148); blush.rotation.y = s * .55;
    face.add(blush);
  });
  const eyes = [-1, 1].map(s => {
    const e = eye(isAmelie ? '#5f8a8c' : '#5d84a0');
    e.position.set(s * .058, .022, .152); e.rotation.y = s * .32;
    face.add(e);
    return e;
  });
  const brows = [-1, 1].map(s => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(.007, .038, 4, 8), new THREE.MeshBasicMaterial({ color: isAmelie ? '#7a5638' : '#2a1d16' }));
    b.rotation.z = Math.PI / 2 + s * .12; b.position.set(s * .058, .078, .143); b.rotation.y = s * .32;
    face.add(b);
    return b;
  });
  const mouth = smile(isAmelie ? '#c0476a' : '#a34058', isAmelie ? .036 : .04);
  mouth.position.set(0, -.062, .153); mouth.rotation.x = -.35;
  face.add(mouth);

  // hair
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.182, 32, 16, 0, Math.PI * 2, 0, Math.PI * (isAmelie ? .52 : .42)), hair);
  cap.rotation.x = -.32;
  cap.position.set(0, .012, -.012);
  face.add(cap);
  if (isAmelie) {
    // long hair falling behind and over the shoulders, a side parting with a fringe
    // (phi = π/2 is the front: leave a gap there for the face)
    const back = new THREE.Mesh(new THREE.SphereGeometry(.19, 28, 16, Math.PI * .85, Math.PI * 1.3, Math.PI * .25, Math.PI * .6), hair);
    back.scale.set(1.02, 1.45, .95); back.position.set(0, -.11, -.02);
    face.add(back);
    [-1, 1].forEach(s => {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .2, 6, 12), hair);
      strand.position.set(s * .15, -.12, .03); strand.rotation.z = s * -.12; strand.scale.set(.85, 1, .7);
      face.add(strand);
    });
    const fringe = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), hair);
    fringe.scale.set(1.25, .45, .9); fringe.position.set(.035, .118, .09); fringe.rotation.set(.55, 0, -.32);
    face.add(fringe);
    // round glasses
    const frame = new THREE.MeshBasicMaterial({ color: '#2a2226' });
    [-1, 1].forEach(s => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.043, .0055, 8, 28), frame);
      ring.position.set(s * .058, .022, .17); ring.rotation.y = s * .3;
      face.add(ring);
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .14, 6), frame);
      temple.rotation.x = Math.PI / 2; temple.position.set(s * .158, .028, .1);
      face.add(temple);
    });
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .03, 6), frame);
    bridge.rotation.z = Math.PI / 2; bridge.position.set(0, .03, .18);
    face.add(bridge);
    // shell necklace
    const shellMat = mat('#fffaf2', .3);
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (.12 + .76 * i / 10);
      const b = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), shellMat);
      b.scale.set(1.2, .8, .8);
      b.position.set(Math.cos(a) * .085, -.205 - Math.sin(a) * .03, Math.sin(a) * .07);
      root.add(b);
    }
  } else {
    // short hair, a little quiff in front
    const quiff = new THREE.Mesh(new THREE.SphereGeometry(.11, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), hair);
    quiff.scale.set(1.35, .5, 1); quiff.position.set(-.01, .13, .07); quiff.rotation.set(.5, 0, .12);
    face.add(quiff);
    [-1, 1].forEach(s => {
      const side = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), hair);
      side.scale.set(.5, 1, 1.1); side.position.set(s * .162, .05, -.02);
      face.add(side);
    });
  }

  const state = { blinkAt: 1 + Math.random() * 3, phase: Math.random() * 10 };
  const tmp = new THREE.Vector3(), m4 = new THREE.Matrix4();

  return {
    group: root, head, armL, armR,
    /** look: world point to look at (or null), wave: 0..1 */
    update(t, dt, { look = null, wave = 0, steer = 0 } = {}) {
      // blink
      if (t > state.blinkAt) { state.blinkAt = t + 2.2 + Math.random() * 3.2; state.blinkEnd = t + .13; }
      const closed = t < (state.blinkEnd || 0) ? .12 : 1;
      eyes.forEach(e => (e.scale.y = closed));
      // head: idle bob, or turned towards the camera
      let yaw = Math.sin(t * .7 + state.phase) * .25, pitch = Math.sin(t * .5 + state.phase) * .06;
      if (look) {
        root.updateWorldMatrix(true, false);
        tmp.copy(look).applyMatrix4(m4.copy(root.matrixWorld).invert());
        yaw = THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -1.1, 1.1);
        pitch = THREE.MathUtils.clamp(-Math.atan2(tmp.y - .1, Math.hypot(tmp.x, tmp.z)), -.5, .5);
      }
      head.rotation.y += (yaw - head.rotation.y) * Math.min(1, dt * 5);
      head.rotation.x += (pitch - head.rotation.x) * Math.min(1, dt * 5);
      head.rotation.z = Math.sin(t * 1.3 + state.phase) * .04;
      // arms: on the controls, one of them waves
      armR.rotation.x = -.9 + Math.sin(t * 2 + state.phase) * .03 + steer * .2;
      // waving: the shoulder lifts, the arm goes up next to the head and swings
      const w = wave;
      armL.position.y = -.22 + .1 * w;
      armL.rotation.x = -.9 * (1 - w) - 2.9 * w;
      armL.rotation.z = .25 + w * (.32 + Math.sin(t * 9) * .26);
    }
  };
}

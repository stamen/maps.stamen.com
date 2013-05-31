/* controls for moving the camera with keyboard, for use with 3d */

window.addEventListener('keypress', function (e) {
  // var jump = 10;
  switch (e.keyCode) {
    // case 119:
    //   camera.position.y += jump;
    //   break;
    // case 97:
    //   camera.position.x -= jump;
    //   break;
    // case 115:
    //   camera.position.y -= jump;
    //   break;
    // case 100:
    //   camera.position.x += jump;
    //   break;
    case 101:
      camera.position.z -= jump;
      break;
    case 114:
      camera.position.z += jump;
      break;
    case 122:
      camera.rotation.x += 0.01;
      break;
    case 120:
      camera.rotation.x -= 0.01;
      break;
    default:
      break;
  }
}, false);
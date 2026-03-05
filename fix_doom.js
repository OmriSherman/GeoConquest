const sharp = require('sharp');
sharp('assets/avatars/Gemini_Generated_Image_6j90f86j90f86j90.png')
  .extract({ left: 0, top: 0, width: 1408, height: 1536 })
  .resize(512, 512, { fit: 'cover' })
  .toFile('assets/avatars/doom_avatar.png');

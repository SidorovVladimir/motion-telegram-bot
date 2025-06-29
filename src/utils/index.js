export const isJPEG = (buffer) => {
  return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
};

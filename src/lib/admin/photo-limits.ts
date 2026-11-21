/**
 * Size limits of a gallery photo (spec #6, §6.3), in a module with no
 * dependencies: the browser reduces to them and the server checks them, and
 * the browser must not pull image-size into its bundle to know the numbers.
 */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_PHOTO_SIDE = 2400;

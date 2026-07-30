
const url = "https://res.cloudinary.com/dh6uiegxw/video/fetch/s--boQvH_gt--/ac_aac,b_black,c_pad,f_mp4,h_1920,vc_h264,w_1080/https://cdn.pixabay.com/video/2024/05/31/214669_large.mp4?_a=BAMAPqiu0";
const regex = /\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$)/i;
console.log("Regex test:", regex.test(url));
console.log("Includes /video/:", url.includes('/video/'));

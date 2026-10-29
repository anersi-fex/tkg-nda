/**
 * Runs before paint (inline in <head>): applies a saved light/dark choice from the theme toggle,
 * so pages never flash the other look. A browser that blocks storage (private mode) follows the phone.
 */
export const THEME_SCRIPT = `try{var d=document.documentElement,t=null;try{t=localStorage.getItem("theme")}catch(e){}if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}`;

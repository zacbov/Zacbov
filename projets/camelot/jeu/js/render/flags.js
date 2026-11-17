export const flags = {
    light: true,
    ao: true,
    tex: true,
    grade: true,
    exposure: true,
    soft: true
};
export const setFlags = (partial)=>{
    Object.assign(flags, partial);
};

import jwt from "jsonwebtoken";

export async function generateAuthToken(data) {
    try {
        if(data.password) {
            data.password = undefined;
        }
        return jwt.sign({data}, process.env.ACCESS_TOKEN_SECRET);        
    } catch (error) {
        console.log({error});
    }
}
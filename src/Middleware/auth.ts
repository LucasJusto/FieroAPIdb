import { HTTPCodes } from '../utils/HTTPEnum.js'
import jwt from 'jsonwebtoken'
import variables from '../config/EnviromentVariables.js'
import express from 'express'


export const authToken = () => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const token = req.get('authToken')
        if (!token) {
            res.status(HTTPCodes.BadRequest).json({ error: "No authentication token was found at header. Please include it with the key authToken" })
            return
        }
        else {
            const secretKey = variables.USER_AUTH_TOKEN_KEY as string
            jwt.verify(token, secretKey, (error, decoded: any) => {
                if(error) {
                    res.status(HTTPCodes.Unauthorized).json({ error: "invalid token" })
                }
                else {
                    req.body.userId = decoded.id
                    return next()  
                }
            })
        }
    }
}
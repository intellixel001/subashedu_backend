import dotenv from "dotenv";
import { app, httpServer } from "./app.js";
import connectDb from "./db/index.js";

dotenv.config({
  path: "./.env",
});

connectDb()
  .then(() => {
    app.on("error", (err) => {
      console.log("Express server error : ", err);
    });
    //app.listen
    httpServer.listen(process.env.PORT || 8000, "0.0.0.0", () => {
      console.log(`Server is running on PORT ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb connection failed! ", err);
  });

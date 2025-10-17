import { upload } from "./multer.js";
import { uploadPdf } from "./multerPDF.js";

export const combinedUpload = (req, res, next) => {
  // First handle PDFs
  uploadPdf.array("pdfs", 10)(req, res, (err) => {
    if (err) return next(err);

    // Then handle image thumbnail
    upload.fields([{ name: "thumbnail", maxCount: 1 }])(req, res, (err2) => {
      if (err2) return next(err2);

      // Proceed to controller
      next();
    });
  });
};

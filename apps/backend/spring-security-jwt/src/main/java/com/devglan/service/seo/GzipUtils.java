package com.devglan.service.seo;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPOutputStream;

public final class GzipUtils {
    private GzipUtils() {}

    public static byte[] gzipString(String input) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (GZIPOutputStream gos = new GZIPOutputStream(baos)) {
            gos.write(input.getBytes(StandardCharsets.UTF_8));
        }
        return baos.toByteArray();
    }
}

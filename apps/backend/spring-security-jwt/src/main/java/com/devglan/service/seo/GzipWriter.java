package com.devglan.service.seo;

public final class GzipWriter {
    private GzipWriter() {}

    public static byte[] gzipString(String input) throws Exception {
        return GzipUtils.gzipString(input);
    }
}

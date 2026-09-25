package com.smarthire.tenant.landing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadImageResponse {

    private String url;
    private String filename;
    private long size;
    private String contentType;
}

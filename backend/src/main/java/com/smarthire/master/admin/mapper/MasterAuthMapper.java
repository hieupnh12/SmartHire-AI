package com.smarthire.master.admin.mapper;

import com.smarthire.domain.master.entity.PlatformUser;
import com.smarthire.master.admin.dto.PlatformUserResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper
public interface MasterAuthMapper {

    PlatformUserResponse toPlatformUserResponse(PlatformUser platformUser);

    List<PlatformUserResponse> toPlatformUserResponseList(List<PlatformUser> platformUsers);
}

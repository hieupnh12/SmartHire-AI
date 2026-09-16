package com.smarthire.tenant.auth.mapper;

import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.entity.UserProfile;
import com.smarthire.tenant.auth.dto.CandidateProfileResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface AuthMapper {

    UserResponse toUserResponse(User user);

    List<UserResponse> toUserResponseList(List<User> users);

    @Mapping(target = "id", source = "user.id")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "role", source = "user.role")
    @Mapping(target = "status", source = "user.status")
    @Mapping(target = "avatarUrl", source = "profile.avatarUrl")
    @Mapping(target = "headline", source = "profile.headline")
    CandidateProfileResponse toCandidateProfileResponse(User user, UserProfile profile);
}



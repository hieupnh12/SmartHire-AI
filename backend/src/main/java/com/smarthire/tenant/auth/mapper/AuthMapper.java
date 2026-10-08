package com.smarthire.tenant.auth.mapper;

import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.tenant.auth.dto.CandidateProfileResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface AuthMapper {

    @Mapping(target = "permissions", ignore = true)
    @Mapping(target = "workspace", ignore = true)
    @Mapping(target = "headline", ignore = true)
    @Mapping(target = "bio", ignore = true)
    UserResponse toUserResponse(User user);

    List<UserResponse> toUserResponseList(List<User> users);

    @Mapping(target = "role", constant = "CANDIDATE")
    CandidateProfileResponse toCandidateProfileResponse(Candidate candidate);
}



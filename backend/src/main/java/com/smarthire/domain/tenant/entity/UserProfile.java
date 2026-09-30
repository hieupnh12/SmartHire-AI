package com.smarthire.domain.tenant.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "user_profiles")
public class UserProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true) User user;

    String phone;

    @Column(name = "avatar_url") String avatarUrl;

    @Column(columnDefinition = "TEXT") String bio;

    String headline;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "links_json", columnDefinition = "json") String linksJson;
}

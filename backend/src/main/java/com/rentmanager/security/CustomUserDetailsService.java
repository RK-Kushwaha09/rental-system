package com.rentmanager.security;

import com.rentmanager.model.User;
import com.rentmanager.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByMobile(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .or(() -> userRepository.findByUserId(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + identifier));

        return new org.springframework.security.core.userdetails.User(
                user.getMobile() != null ? user.getMobile() : user.getUserId(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole() != null ? user.getRole() : "ROLE_LANDLORD"))
        );
    }
}

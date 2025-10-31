from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class UserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(read_only=True)
    class Meta:
        from users.models import User
        model = User
        fields = ['id', 'username', 'bio', 'profile_image']


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True)
    password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            print(attrs)
            raise serializers.ValidationError({"password": "Password do not match."})
        return attrs
    
    def validate_username(self, value):
        from users.models import User
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError({'username': "username already exists."})
        return value

    def validate_password(self, value):
        try: 
            validate_password(value)

        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def create(self, validated_data):
        username = validated_data['username']
        password = validated_data['password']

        from users.models import User
        user = User.objects.create_user(
            username=username,
            password=password
        )

        return user
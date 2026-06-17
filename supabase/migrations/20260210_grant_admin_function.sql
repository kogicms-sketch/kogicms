-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_support_group_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_support_group_admin TO service_role;
